import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css'

import { Web3Wrapper } from '@0x/web3-wrapper';
import { MetamaskSubprovider, Web3ProviderEngine, RPCSubprovider } from '@0x/subproviders'
import { FAKE_DAI, FAKE_USDC, MetamaskWindow, INFURA_RPC_URL, DEFAULT_MINT_AMOUNT, linkBtnToCallback, mintTokens, setTextOnDOMElement, ERC20TokenContract } from './misc';
import { performSwapAsync } from './exercise';
import { getContractAddressesForChainOrThrow, ChainId } from '@0x/contract-addresses';


document.addEventListener("DOMContentLoaded", async () => {

    // SETUP: We check to ensure that Metamask is available. Based on the documentation
    // When MetaMask is available, it injects the `window.ethereum` function.
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

    const daiToken = new ERC20TokenContract(FAKE_DAI, provider);
    const usdcToken = new ERC20TokenContract(FAKE_USDC, provider);
    const daiDecimals = await daiToken.decimals().callAsync();
    const usdcDecimals = await usdcToken.decimals().callAsync();

    linkBtnToCallback("mintDAI", () => mintTokens(account, FAKE_DAI, provider, DEFAULT_MINT_AMOUNT));
    linkBtnToCallback("mintUSDC", () => mintTokens(account, FAKE_USDC, provider, DEFAULT_MINT_AMOUNT));
    linkBtnToCallback("swapDaiForUsdc", () => performSwapAsync(usdcToken, daiToken, 100, account, provider));
    linkBtnToCallback("swapUsdcForDai", () => performSwapAsync(daiToken, usdcToken, 100, account, provider));

    const zeroExDeployedAddresses = getContractAddressesForChainOrThrow(ChainId.Kovan);
    setInterval(async () => {

        const daiBalance = await daiToken.balanceOf(account).callAsync()
        const usdcBalance = await usdcToken.balanceOf(account).callAsync()
        const daiAllowance = await daiToken.allowance(account, zeroExDeployedAddresses.erc20Proxy).callAsync();
        const usdcAllowance = await usdcToken.allowance(account, zeroExDeployedAddresses.erc20Proxy).callAsync();
        const usdcAllowanceText = Web3Wrapper.toUnitAmount(usdcAllowance, usdcDecimals.toNumber()).decimalPlaces(2);
        const daiAllowanceText = Web3Wrapper.toUnitAmount(daiAllowance, daiDecimals.toNumber()).decimalPlaces(2);;

        setTextOnDOMElement('fakeDaiBalance', Web3Wrapper.toUnitAmount(daiBalance, daiDecimals.toNumber()).decimalPlaces(2).toString());
        setTextOnDOMElement('fakeUsdcBalance', Web3Wrapper.toUnitAmount(usdcBalance, usdcDecimals.toNumber()).decimalPlaces(2).toString());
        setTextOnDOMElement('fakeDaiAllowance', daiAllowanceText.toString());
        setTextOnDOMElement('fakeUsdcAllowance', usdcAllowanceText.toString());
    }, 2000)
});