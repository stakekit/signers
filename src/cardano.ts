import { EmbeddedWallet } from '@meshsdk/core';
import {
  deserializeTxHash,
  Ed25519PublicKeyHex,
  Ed25519SignatureHex,
  resolveTxHash,
  VkeyWitness,
} from '@meshsdk/core-cst';
import { isLedgerOptions, WalletOptions } from './constants';

export const getCardanoWallet = async (options: WalletOptions) => {
  if (isLedgerOptions(options)) {
    // TODO add ledger support
    throw new Error('Ledger mode is not supported.');
  }

  const { mnemonic } = options;

  const wallet = new EmbeddedWallet({
    networkId: 1,
    key: {
      type: 'mnemonic',
      words: mnemonic.split(' '),
    },
  });

  return wallet;
};

export const signCardanoTx = (
  wallet: EmbeddedWallet,
  unsignedTx: string,
): string => {
  const { paymentKey, stakeKey } = wallet.getAccount();

  const hash = deserializeTxHash(resolveTxHash(unsignedTx));

  const paymentKeyWitness = new VkeyWitness(
    Ed25519PublicKeyHex(paymentKey.toPublicKey().toBytes().toString('hex')),
    Ed25519SignatureHex(
      paymentKey.sign(Buffer.from(hash, 'hex')).toString('hex'),
    ),
  );

  const stakeKeyWitness = new VkeyWitness(
    Ed25519PublicKeyHex(stakeKey.toPublicKey().toBytes().toString('hex')),
    Ed25519SignatureHex(
      stakeKey.sign(Buffer.from(hash, 'hex')).toString('hex'),
    ),
  );

  const signedTx = EmbeddedWallet.addWitnessSets(unsignedTx, [
    paymentKeyWitness,
    stakeKeyWitness,
  ]);

  return signedTx;
};
