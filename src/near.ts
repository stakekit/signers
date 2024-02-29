import * as bs58 from 'bs58';
import { derivePath } from 'ed25519-hd-key';
import { Signer, utils } from 'near-api-js';
import * as nacl from 'tweetnacl';

import { getSeed } from './common';
import {
  isLedgerOptions,
  LedgerApps,
  walletDerivationPaths,
  WalletOptions,
} from './constants';

import { NearLedgerSigner, NearSigner } from './ledger/near';
import Near from '@ledgerhq/hw-app-near';

export async function nearKeyPairToAddress(keyPair: Signer) {
  const pubKey = (await keyPair.getPublicKey()).toString();

  return Buffer.from(
    bs58.decode(
      pubKey.startsWith('ed25519:') ? pubKey.replace('ed25519:', '') : pubKey,
    ),
  ).toString('hex');
}

export const getNearWallet = async (options: WalletOptions) => {
  if (isLedgerOptions(options)) {
    if (options.config.NEAR?.derivationPath === undefined) {
      throw new Error('no derivation path');
    }

    const transport = await options.transport(LedgerApps.NEAR);
    const near = new Near(transport);

    return new NearLedgerSigner(near, options.config.NEAR.derivationPath);
  }

  const { mnemonic, walletType, index } = options;
  const seed = await getSeed(mnemonic);

  const derivationPath = walletDerivationPaths[walletType].near(index)!;
  const { key } = derivePath(derivationPath, Buffer.from(seed).toString('hex'));

  const keyPair = nacl.sign.keyPair.fromSeed(key);

  const secretKey = 'ed25519:' + bs58.encode(Buffer.from(keyPair.secretKey));

  const kp = utils.KeyPair.fromString(secretKey);
  return new NearSigner(kp);
};
