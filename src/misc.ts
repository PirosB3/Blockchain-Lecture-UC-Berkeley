import { BigNumber } from "@0x/utils";
import { SupportedProvider, Web3Wrapper } from "@0x/web3-wrapper";
import { DummyERC20TokenContract } from "@0x/contracts-erc20";

export const DEFAULT_MINT_AMOUNT = new BigNumber(10_000);
export const DEFAULT_ALLOWANCE_AMOUNT = new BigNumber(1_000_000);
export const FAKE_DAI = '0x48178164eB4769BB919414Adc980b659a634703E';
export const FAKE_USDC = '0x5a719Cf3E02c17c876F6d294aDb5CB7C6eB47e2F';
export const INFINITE_ALLOWANCE = new BigNumber(2).pow(256).minus(1);
export const IN_A_YEAR = new BigNumber(1616731441);
export const ZERO = new BigNumber(0);
export const DEFAULT_GAS_PRICE = new BigNumber(5000000000);
export const KOVAN_0x_API = 'https://kovan.api.0x.org'
export const INFURA_RPC_URL = 'https://kovan.infura.io/v3/f98b693fe61e41ada1a82dab93a3a888'
export const MAP_TOKEN_TO_NAME: {[key: string]: string} = {
    [FAKE_DAI]: 'DAI',
    [FAKE_USDC]: 'DAI',
}

// Please don't mind this interface definition, it's only needed to
// tell TypeScript that `web3` and `ethereum` may be globally defined
export interface MetamaskWindow {
    web3?: {
        currentProvider: SupportedProvider,
    }
    ethereum?: {
        enable(): Promise<[string]>
        on(event: string, callback: () => void): void;
    }
}


/**
 * Links the `onclick` event of a button denoted by ID to a callback
 * @param buttonId the button ID as a string, must be unique
 * @param callback a JS function callback that is triggered with the button is pressed
 */
export function linkBtnToCallback(buttonId: string, callback: (...args: any[]) => any): void {
    const button = document.getElementById(buttonId);
    if (button === null) {
        throw new Error(`Button ${buttonId} was not found`);
    }
    button.onclick = callback;
}

/**
 * A simple utility to set text on to a ID
 * @param buttonId the button ID as a string, must be unique
 * @param text a string to set
 */
export function setTextOnDOMElement(buttonId: string, text: string): void {
    const button = document.getElementById(buttonId);
    if (button === null) {
        throw new Error(`Button ${buttonId} was not found`);
    }
    button.innerText = text;
}


/**
 * A simple utility that can be used to mint tokens. The DummyERC20Token contract exposes a special
 * `mint()` function that can be used to create tokens out of thin air!
 * 
 * @param fromAddress the address receiving the tokens
 * @param tokenAddress the address of the ERC20 token
 * @param provider the Web3 provider
 * @param mintAmount the amount to mint, this can be a maximum of 10,000
 */
export async function mintTokens(fromAddress: string, tokenAddress: string, provider: SupportedProvider, mintAmount: BigNumber = DEFAULT_MINT_AMOUNT): Promise<string> {
    const contractInstance = new DummyERC20TokenContract(tokenAddress, provider);
    const numDecimals = await contractInstance.decimals().callAsync();
    const mintAmountInBaseUnits = Web3Wrapper.toBaseUnitAmount(mintAmount, numDecimals.toNumber());

    const tx = await contractInstance.mint(mintAmountInBaseUnits).awaitTransactionSuccessAsync({
        from: fromAddress,
    });
    return tx.transactionHash;
}
