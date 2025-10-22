import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import {
  isLedgerOptions,
  walletDerivationPaths,
  WalletOptions,
} from './constants.js';

export interface SuiSigner {
  getAddress: () => Promise<string>;
  getAdditionalAddresses: () => Promise<Record<string, never>>;
  signTransaction: (unsignedTransactionXdr: string) => Promise<string>;
}

export class SuiKeypairSigner implements SuiSigner {
  private keypair: Ed25519Keypair;

  constructor(keypair: Ed25519Keypair) {
    this.keypair = keypair;
  }

  async getAddress(): Promise<string> {
    return this.keypair.getPublicKey().toSuiAddress();
  }

  async getAdditionalAddresses(): Promise<Record<string, never>> {
    return {};
  }

  async signTransaction(unsignedTransaction: string): Promise<string> {
    const client = new SuiClient({ url: getFullnodeUrl('mainnet') });
    const tx = Transaction.from(
      Buffer.from(unsignedTransaction, 'base64').toString(),
    );
    const { signature } = await tx.sign({
      client,
      signer: this.keypair,
    });

    return signature;
  }
}

export const getSuiWallet = async (
  options: WalletOptions,
): Promise<SuiSigner> => {
  if (isLedgerOptions(options)) {
    throw new Error('Sui Ledger support not implemented');
  }

  const walletDerivationPath = walletDerivationPaths[options.walletType];
  if (walletDerivationPath === undefined) {
    throw new Error(
      `Sui derivation path not supported for wallet type: ${options.walletType}`,
    );
  }

  const derivationPath = walletDerivationPath.sui?.(options.index);
  if (derivationPath === undefined) {
    throw new Error(
      `Sui derivation path not supported for wallet type: ${options.walletType}`,
    );
  }

  const keypair = Ed25519Keypair.deriveKeypair(
    options.mnemonic,
    derivationPath,
  );

  return new SuiKeypairSigner(keypair);
};
