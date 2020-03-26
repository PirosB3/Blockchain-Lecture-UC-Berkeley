import { BigNumber } from "@0x/utils";
import { SupportedProvider } from "@0x/web3-wrapper";

export const DEFAULT_MINT_AMOUNT = new BigNumber(10_000);
export const FAKE_DAI = '0x48178164eB4769BB919414Adc980b659a634703E';
export const FAKE_USDC = '0x5a719Cf3E02c17c876F6d294aDb5CB7C6eB47e2F';
export const INFINITE_ALLOWANCE = new BigNumber(2).pow(256).minus(1);
export const IN_A_YEAR = new BigNumber(1616731441);
export const ZERO = new BigNumber(0);
export const DEFAULT_GAS_PRICE = new BigNumber(5000000000);
export const KOVAN_0x_API = 'https://kovan.api.0x.org'
export const INFURA_RPC_URL = 'https://kovan.infura.io/v3/f98b693fe61e41ada1a82dab93a3a888'

export interface MetamaskWindow {
    web3: {
        currentProvider: SupportedProvider,
    }
    ethereum?: {
        enable(): Promise<[string]>
        on(event: string, callback: () => void): void;
    }
}

