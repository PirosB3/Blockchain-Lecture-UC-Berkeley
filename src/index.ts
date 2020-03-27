import 'bootstrap/dist/css/bootstrap.min.css';

import {DummyERC20TokenContract} from '@0x/contracts-erc20';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { MetamaskSubprovider, Web3ProviderEngine, RPCSubprovider } from '@0x/subproviders'
import { FAKE_DAI, FAKE_USDC, MetamaskWindow, INFURA_RPC_URL, DEFAULT_MINT_AMOUNT, linkBtnToCallback, mintTokens } from './misc';
import { setAllowances, performSwapAsync, getDecimalsForTokenAsync } from './exercise';


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
    linkBtnToCallback("swapDaiForUsdc", () => performSwapAsync(FAKE_USDC, FAKE_DAI, 100, account, client));
    linkBtnToCallback("swapUsdcForDai", () => performSwapAsync(FAKE_DAI, FAKE_USDC, 100, account, client));

    const daiDecimals = await getDecimalsForTokenAsync(FAKE_DAI, provider);
    const usdcDecimals = await getDecimalsForTokenAsync(FAKE_USDC, provider);
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