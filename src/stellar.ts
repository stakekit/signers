import {
  Networks as StellarNetworks,
  Keypair,
  Transaction,
} from '@stellar/stellar-sdk';
import { derivePath } from 'ed25519-hd-key';
import { Networks } from '@stakekit/common';

import { getSeed } from './common';
import {
  WalletOptions,
  isLedgerOptions,
  walletDerivationPaths,
} from './constants';

const getStellarNetworkPassphrase = (network: Networks): string => {
  switch (network) {
    case Networks.Stellar:
      return StellarNetworks.PUBLIC;
    case Networks.StellarTestnet:
      return StellarNetworks.TESTNET;
    default:
      throw new Error(`Unsupported Stellar network: ${network}`);
  }
};

export interface StellarSigner {
  getAddress: () => Promise<string>;
  getAdditionalAddresses: () => Promise<Record<string, never>>;
  signTransaction: (unsignedTransactionXdr: string) => Promise<string>;
}

export class StellarKeypairSigner implements StellarSigner {
  private keypair: Keypair;
  private network: Networks;

  constructor(ed25519PrivateKey: Uint8Array, network: Networks) {
    this.keypair = Keypair.fromRawEd25519Seed(Buffer.from(ed25519PrivateKey));
    this.network = network;
  }

  async getAddress(): Promise<string> {
    return this.keypair.publicKey();
  }

  async getAdditionalAddresses(): Promise<Record<string, never>> {
    return {};
  }

  async signTransaction(unsignedTransactionXdr: string): Promise<string> {
    const networkPassphrase = getStellarNetworkPassphrase(this.network);

    const transaction = new Transaction(
      unsignedTransactionXdr,
      networkPassphrase,
    );

    transaction.sign(this.keypair);

    return transaction.toXDR();
  }
}

async function deriveEd25519PrivateKey(
  mnemonic: string,
  derivationPath: string,
): Promise<Uint8Array> {
  const seed = Buffer.from(await getSeed(mnemonic)).toString('hex');
  const key = derivePath(derivationPath, seed).key;
  return key;
}

export const getStellarWallet = async (
  network: Networks,
  options: WalletOptions,
): Promise<StellarSigner> => {
  if (isLedgerOptions(options)) {
    throw new Error('Stellar Ledger support not implemented');
  }

  const walletDerivationPath = walletDerivationPaths[options.walletType];
  if (walletDerivationPath === undefined) {
    throw new Error(
      `Stellar derivation path not supported for wallet type: ${options.walletType}`,
    );
  }

  const derivationPath = walletDerivationPath.stellar(options.index);
  if (derivationPath === undefined) {
    throw new Error(
      `Stellar derivation path not supported for wallet type: ${options.walletType}`,
    );
  }

  const ed25519PrivateKey = await deriveEd25519PrivateKey(
    options.mnemonic,
    derivationPath,
  );

  return new StellarKeypairSigner(ed25519PrivateKey, network);
};
