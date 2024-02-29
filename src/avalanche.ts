import { Avalanche, Buffer } from 'avalanche/dist';
import {
  EVMAPI,
  Tx as EvmTx,
  UnsignedTx as UnsignedEvmTx,
} from 'avalanche/dist/apis/evm';
import {
  Tx as PlatformTx,
  PlatformVMAPI,
  UnsignedTx as UnsignedPlatformTx,
} from 'avalanche/dist/apis/platformvm';
import { Serialization } from 'avalanche/dist/utils';
import { ethers } from 'ethers';

import {
  LedgerApps,
  LedgerOptions,
  MnemonicWalletOptions,
  WalletOptions,
  getEthereumWallet,
  isLedgerOptions,
} from '.';
import { StakeKitAvalancheWallet } from './ledger/avalanche';

const serialization = Serialization.getInstance();

export interface AvalancheKeyChains {
  ethereumAddress: string;

  cchain: EVMAPI;
  pchain: PlatformVMAPI;
  getEthereumAddress: () => Promise<string>;
  getCAddressString: () => string;
  getCAddressStrings: () => string[];
  getPAddressString: () => string;
  getPAddressBuffer: () => Buffer;
  getPAddressStrings: () => string[];
  getPAddressBuffers: () => Buffer[];

  signC: (tx: UnsignedEvmTx) => Promise<EvmTx>;
  signP: (tx: UnsignedPlatformTx) => Promise<PlatformTx>;
}

const getLedgerWallet = async (
  avalanche: Avalanche,
  options: LedgerOptions,
): Promise<AvalancheKeyChains | null> => {
  const transport = await options.transport(LedgerApps.Avalanche);
  const ledgerWallet = await StakeKitAvalancheWallet.fromStakeKitTransport(
    transport,
    options.config.Avalanche?.derivationPath as string,
    options.config.Ethereum?.derivationPath as string,
  );

  if (ledgerWallet === undefined) {
    return null;
  }

  const ethereumAddress = ledgerWallet.getAddressC();
  const cAddressBech = ledgerWallet.getEvmAddressBech();
  const pAddressBech = ledgerWallet.getAddressP();

  const pchain = avalanche.PChain();
  const cchain = avalanche.CChain();

  const pAddressBuffer = serialization.typeToBuffer(
    pAddressBech,
    'bech32',
    avalanche.getHRP(),
    1,
  );

  return {
    cchain,
    pchain,

    ethereumAddress,

    signC: (tx: UnsignedEvmTx) => ledgerWallet.signC(tx),
    signP: (tx: UnsignedPlatformTx) => ledgerWallet.signP(tx),

    getEthereumAddress: async () => ethereumAddress,
    getCAddressString: () => cAddressBech,
    getCAddressStrings: () => [cAddressBech],
    getPAddressString: () => pAddressBech,
    getPAddressStrings: () => [pAddressBech],
    getPAddressBuffer: () => pAddressBuffer,
    getPAddressBuffers: () => [pAddressBuffer],
  };
};

const getMnemonicWallet = async (
  avalanche: Avalanche,
  options: MnemonicWalletOptions,
): Promise<AvalancheKeyChains | null> => {
  if (!options.mnemonic) {
    return null;
  }

  // @ts-expect-error
  const wallet: ethers.Wallet | null = await getEthereumWallet(options);
  if (!wallet) {
    return null;
  }

  const pchain = avalanche.PChain();
  const cchain = avalanche.CChain();
  cchain.keyChain().importKey(Buffer.from(wallet.privateKey.slice(2), 'hex'));
  pchain.keyChain().importKey(Buffer.from(wallet.privateKey.slice(2), 'hex'));

  return {
    cchain,
    pchain,
    ethereumAddress: await wallet.getAddress(),

    signC: async (tx: UnsignedEvmTx) => tx.sign(cchain.keyChain()),
    signP: async (tx: UnsignedPlatformTx) => tx.sign(pchain.keyChain()),

    getEthereumAddress: () => wallet.getAddress(),
    getCAddressString: () => cchain.keyChain().getAddressStrings()[0],
    getCAddressStrings: () => cchain.keyChain().getAddressStrings(),
    getPAddressString: () => pchain.keyChain().getAddressStrings()[0],
    getPAddressStrings: () => pchain.keyChain().getAddressStrings(),
    getPAddressBuffers: () => pchain.keyChain().getAddresses(),
    getPAddressBuffer: () => pchain.keyChain().getAddresses()[0],
  };
};

export const getAvalancheWallet = (
  avalanche: Avalanche,
  options: WalletOptions | LedgerOptions,
) => {
  if (isLedgerOptions(options)) {
    return getLedgerWallet(avalanche, options);
  }
  return getMnemonicWallet(avalanche, options);
};
