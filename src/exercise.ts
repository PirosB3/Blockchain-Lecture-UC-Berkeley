import axios from 'axios';
import { Web3Wrapper, TxData } from "@0x/web3-wrapper";
import { KOVAN_0x_API, ERC20TokenContract, INFINITE_ALLOWANCE } from "./misc";
import { getContractAddressesForChainOrThrow, ChainId } from "@0x/contract-addresses";

const zeroExDeployedAddresses = getContractAddressesForChainOrThrow(ChainId.Kovan);

async function getAllowanceForTokenAsync(fromAddress: string, tokenWrapper: ERC20TokenContract): Promise<number> {
    const decimals = await tokenWrapper.decimals().callAsync()
    const remainingAllowance = await tokenWrapper.allowance(fromAddress, zeroExDeployedAddresses.erc20Proxy).callAsync();
    return Web3Wrapper.toUnitAmount(remainingAllowance, decimals.toNumber()).toNumber();
}

async function getBalanceForTokenAsync(fromAddress: string, tokenWrapper: ERC20TokenContract): Promise<number> {
    const decimals = await tokenWrapper.decimals().callAsync()
    const balance = await tokenWrapper.balanceOf(fromAddress).callAsync();
    return Web3Wrapper.toUnitAmount(balance, decimals.toNumber()).toNumber();
}

/**
 * Performs a trade by requesting a quote from the 0x API, and filling that quote on the blockchain
 * @param buyToken the token address to buy
 * @param sellToken the token address to sell
 * @param amountToSellUnitAmount the token amount to sell
 * @param fromAddress the address that will perform the transaction
 * @param client the Web3Wrapper client
 */
export async function performSwapAsync(
    buyTokenWrapper: ERC20TokenContract,
    sellTokenWrapper: ERC20TokenContract,
    amountToSellUnitAmount: number,
    fromAddress: string,
    client: Web3Wrapper
): Promise<void> {

    // Check #1) Does the user have enough balance?
    const currentBalance = await getBalanceForTokenAsync(fromAddress, sellTokenWrapper);
    if (currentBalance < amountToSellUnitAmount) {
        throw new Error(`Current balance is ${currentBalance}, which is less than ${amountToSellUnitAmount}.`);
    }

    // Check #2) Does the 0x ERC20 Proxy have permission to withdraw funds from the exchange?
    const currentAllowance = await getAllowanceForTokenAsync(fromAddress, sellTokenWrapper);
    if (currentAllowance < amountToSellUnitAmount) {
        
        // In order to allow the 0x smart contracts to trade with your funds, you need to set an allowance for zeroExDeployedAddresses.erc20Proxy.
        // This can be done using the `approve` function.
        await sellTokenWrapper.approve(
            zeroExDeployedAddresses.erc20Proxy,
            INFINITE_ALLOWANCE,
        ).awaitTransactionSuccessAsync({from: fromAddress});
    }

    // Step #1) Convert the unit amount into base unit amount (bigint). For this to happen you need the number of decimals the token.
    // Fetch decimals using the getDecimalsForToken(), and use Web3Wrapper.toBaseUnitAmount() to perform the conversion
    const numDecimals = await sellTokenWrapper.decimals().callAsync();
    const sellAmountInBaseUnits = Web3Wrapper.toBaseUnitAmount(amountToSellUnitAmount, numDecimals.toNumber());
    console.log(`Requesting 0x API to provide a quote for swapping ${sellAmountInBaseUnits}`)

    // Step #2) Make a request to the 0x API swap endpoint: https://0x.org/docs/guides/swap-tokens-with-0x-api#swap-eth-for-1-dai
    // You can use the line below as guidance. In the example, the variable TxData contains the deserialized JSON response from the API.
    // const httpResponse = await axios.get<TxData>(url)
    // const txData: TxData = httpResponse.data;
    let apiResponse: TxData;
    try {
        const httpResponse = await axios.get<TxData>(`${KOVAN_0x_API}/swap/v0/quote?buyToken=${buyTokenWrapper.address}&sellToken=${sellTokenWrapper.address}&sellAmount=${sellAmountInBaseUnits}&takerAddress=${fromAddress}`);
        console.log(`Received a response from the 0x API:`)
        apiResponse = httpResponse.data;
        console.log(apiResponse);
    } catch (e) {
        alert(`0x API returned an invalid response, this means your allowance may not be set up or your balance is not enough to complete the trade.`)
        return
    }

    // Step #3) You can `client.sendTransactionAsync()` to send a Ethereum transaction.
    const tx = await client.sendTransactionAsync({
        from: fromAddress,
        to: apiResponse.to,
        data: apiResponse.data,
        gas: apiResponse.gas,
        gasPrice: apiResponse.gasPrice,
        value: apiResponse.value,
    })

    // Step #4) `client.sendTransactionAsync()` returns immediately after submitting a transaction with a transaction hash. you may use `client.awaitTransactionSuccessAsync()`
    // to block until the transaction has been mined.
    const receipt = await client.awaitTransactionSuccessAsync(tx)
    console.log(`Transaction ${receipt.transactionHash} was mined successfully`)
}