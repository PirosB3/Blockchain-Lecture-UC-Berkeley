import 'bootstrap/dist/css/bootstrap.min.css';

import {DummyERC20TokenContract} from '@0x/contracts-erc20';
import { SupportedProvider, Web3Wrapper, TxData } from '@0x/web3-wrapper';
import { getContractAddressesForChainOrThrow, ChainId } from '@0x/contract-addresses'
import { MetamaskSubprovider, Web3ProviderEngine, RPCSubprovider } from '@0x/subproviders'
import {BigNumber } from '@0x/utils';
import axios from 'axios';
import { KOVAN_0x_API, FAKE_DAI, FAKE_USDC, MetamaskWindow, INFURA_RPC_URL, DEFAULT_MINT_AMOUNT, INFINITE_ALLOWANCE, linkBtnToCallback, mintTokens, DEFAULT_ALLOWANCE_AMOUNT, MAP_TOKEN_TO_NAME } from './misc';

/**
 * Returns the decimals for a token. Decimals indicates how many 0's there are to the right of the decimal point the fixed-point representation of a token.
 * @param tokenAddress the address of the token
 * @param provider the supported provider
 */
async function getDecimalsForToken(tokenAddress: string, provider: SupportedProvider): Promise<number> {
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
async function performSwap(buyToken: string, sellToken: string, amountToSellUnitAmount: number, fromAddress: string, client: Web3Wrapper): Promise<string> {
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
async function setAllowances(fromAddress: string, tokenAddress: string, provider: SupportedProvider, allowanceAmount: BigNumber = DEFAULT_ALLOWANCE_AMOUNT): Promise<string> {
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

document.addEventListener("DOMContentLoaded", async () => {

    // SETUP: We check to ensure that Metamask is available. Based on the documentation
    // we have [here](https://docs.metamask.io/guide/getting-started.html), they recommend
    // to check if `window.ethereum` is available and, if it is, we can use `window.ethereum.enable()` to
    // enable MetaMask. `ethereum.approve()` will open a dialog on the UI that will ask for your permission.

    // NOTE: we have to cast `window` to `MetamaskWindow` in order to TypeScript to work correctly.
    const scopedWindow = window as unknown as MetamaskWindow;
    if (scopedWindow.ethereum === undefined) {
        throw new Error('Web3 not defined, please install and unlock Metamask');
    }
    const [account] = await scopedWindow.ethereum.enable();
    scopedWindow.ethereum.on('accountsChanged', () => location.reload());
    if (scopedWindow.web3 === undefined) {
        throw new Error('Web3 not defined, please install and unlock Metamask');
    }

    const providerEngine = new Web3ProviderEngine();
    providerEngine.addProvider(new MetamaskSubprovider(scopedWindow.web3.currentProvider));
    providerEngine.addProvider(new RPCSubprovider(INFURA_RPC_URL));
    providerEngine.start();

    // We initialize the Web3Wrapper, which is 0x's alternative to Web3.js library.
    const client = new Web3Wrapper(providerEngine);
    const provider = client.getProvider();
    const chainId = await client.getChainIdAsync();
    if (chainId !== 42) {
        throw new Error(`Chain ID should be set to Kovan, it was set to ${chainId}`);
    }

    linkBtnToCallback("mintDAI", () => mintTokens(account, FAKE_DAI, provider, DEFAULT_MINT_AMOUNT));
    linkBtnToCallback("mintUSDC", () => mintTokens(account, FAKE_USDC, provider, DEFAULT_MINT_AMOUNT));
    linkBtnToCallback("allowDAI", () => setAllowances(account, FAKE_DAI, provider));
    linkBtnToCallback("allowUSDC", () => setAllowances(account, FAKE_USDC, provider));
    linkBtnToCallback("swapDaiForUsdc", () => performSwap(FAKE_USDC, FAKE_DAI, 100, account, client));
    linkBtnToCallback("swapUsdcForDai", () => performSwap(FAKE_DAI, FAKE_USDC, 100, account, client));

    const daiDecimals = await getDecimalsForToken(FAKE_DAI, provider);
    const usdcDecimals = await getDecimalsForToken(FAKE_USDC, provider);
    setInterval(async () => {
        const daiToken = new DummyERC20TokenContract(FAKE_DAI, provider);
        const usdcToken = new DummyERC20TokenContract(FAKE_USDC, provider);

        const daiBalance = await daiToken.balanceOf(account).callAsync()
        const usdcBalance = await usdcToken.balanceOf(account).callAsync()

        const fakeDaiBalanceText = document.getElementById('fakeDaiBalance');
        if (fakeDaiBalanceText !== null) {
            fakeDaiBalanceText.innerText = Web3Wrapper.toUnitAmount(daiBalance, daiDecimals).toString();
        }
        const fakeUsdcBalanceText = document.getElementById('fakeUsdcBalance');
        if (fakeUsdcBalanceText !== null) {
            fakeUsdcBalanceText.innerText = Web3Wrapper.toUnitAmount(usdcBalance, usdcDecimals).toString();
        }
    }, 2000)
});