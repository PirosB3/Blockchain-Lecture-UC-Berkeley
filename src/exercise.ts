import axios from 'axios';
import { SupportedProvider, Web3Wrapper, TxData } from "@0x/web3-wrapper";import { DummyERC20TokenContract } from "@0x/contracts-erc20";import { MAP_TOKEN_TO_NAME, KOVAN_0x_API, DEFAULT_ALLOWANCE_AMOUNT } from "./misc";import { BigNumber } from "@0x/utils";import { getContractAddressesForChainOrThrow, ChainId } from "@0x/contract-addresses";


/**
 * Returns the decimals for a token. Decimals indicates how many 0's there are to the right of the decimal point the fixed-point representation of a token.
 * @param tokenAddress the address of the token
 * @param provider the supported provider
 */
export async function getDecimalsForToken(tokenAddress: string, provider: SupportedProvider): Promise<number> {
    const contractInstance = new DummyERC20TokenContract(tokenAddress, provider);
    const decimals = await contractInstance.decimals().callAsync()
    return decimals.toNumber();
}

/**
 * Performs a trade by requesting a quote from the 0x API, and filling that quote on the blockchain
 * @param buyToken the token address to buy
 * @param sellToken the token address to sell
 * @param amountToSellUnitAmount the token amount to sell
 * @param fromAddress the address that will perform the transaction
 * @param client the Web3Wrapper client
 */
export async function performSwap(buyToken: string, sellToken: string, amountToSellUnitAmount: number, fromAddress: string, client: Web3Wrapper): Promise<string> {
    // Fetch decimals
    const numDecimals = await getDecimalsForToken(sellToken, client.getProvider());
    const sellAmountInBaseUnits = Web3Wrapper.toBaseUnitAmount(amountToSellUnitAmount, numDecimals);
    console.log(`Requesting 0x API to provide a quote for swapping ${sellAmountInBaseUnits} of ${MAP_TOKEN_TO_NAME[sellToken]} for ${MAP_TOKEN_TO_NAME[buyToken]}`)

    // Make API request
    let apiResponse: TxData;
    try {
        const httpResponse = await axios.get<TxData>(`${KOVAN_0x_API}/swap/v0/quote?buyToken=${buyToken}&sellToken=${sellToken}&sellAmount=${sellAmountInBaseUnits}&takerAddress=${fromAddress}`);
        console.log(`Received a response from the 0x API:`)
        apiResponse = httpResponse.data;
        console.log(apiResponse);
    } catch (e) {
        alert(`0x API returned an invalid response, this means your allowance may not be set up or your balance is not enough to complete the trade.`)
        return '';
    }

    // Perform the transaction on-chain
    const tx = await client.sendTransactionAsync({
        from: fromAddress,
        to: apiResponse.to,
        data: apiResponse.data,
        gas: apiResponse.gas,
        gasPrice: apiResponse.gasPrice,
        value: apiResponse.value,
    })
    const receipt = await client.awaitTransactionSuccessAsync(tx)
    console.log(`Transaction ${receipt.transactionHash} was mined successfully`)
    return receipt.transactionHash;
}

/**
 * Allows the 0x Exchange to pull a limited amount of funds on your behalf
 * @param fromAddress the address that will perform the transaction
 * @param tokenAddress the address of the token
 * @param provider a supported provider
 * @param mintAmount the amount to mint in unit amount
 */
export async function setAllowances(fromAddress: string, tokenAddress: string, provider: SupportedProvider, allowanceAmount: BigNumber = DEFAULT_ALLOWANCE_AMOUNT): Promise<string> {
    const tokenDecimals = await getDecimalsForToken(tokenAddress, provider);
    const contractInstance = new DummyERC20TokenContract(tokenAddress, provider);
    const addresses = getContractAddressesForChainOrThrow(ChainId.Kovan);
    const tx = await contractInstance.approve(
        addresses.erc20Proxy,
        Web3Wrapper.toBaseUnitAmount(allowanceAmount, tokenDecimals),
    ).awaitTransactionSuccessAsync({
        from: fromAddress,
    });
    return tx.transactionHash;
}