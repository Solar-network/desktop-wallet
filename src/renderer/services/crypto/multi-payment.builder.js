import { Transactions } from "@solar-network/crypto";
import { TRANSACTION_TYPES } from "@config";
import store from "@/store";
import { CryptoUtils } from "./utils";
import { TransactionSigner } from "./transaction-signer";

export class MultiPaymentBuilder {
    static async build ({
        address,
        recipients,
        fee,
        memo,
        passphrase,
        secondPassphrase,
        wif,
        networkWif,
        multiSignature,
        nonce
    },
    isAdvancedFee = false,
    returnObject = false
    ) {
        const staticFee = store.getters["transaction/staticFee"](
            TRANSACTION_TYPES.GROUP_1.MULTI_PAYMENT,
            1
        );
        if (!isAdvancedFee && fee.gt(staticFee)) {
            throw new Error(
                `Multi-Payment fee should be smaller than ${staticFee}`
            );
        }

        const transaction = Transactions.BuilderFactory.multiPayment()
            .fee(fee)
            .memo(memo);

        for (const recipient of recipients) {
            transaction.addPayment(recipient.address, recipient.amount);
        }

        passphrase = CryptoUtils.normalizePassphrase(passphrase);
        secondPassphrase = CryptoUtils.normalizePassphrase(secondPassphrase);

        return TransactionSigner.sign({
            address,
            transaction,
            passphrase,
            secondPassphrase,
            wif,
            networkWif,
            multiSignature,
            nonce
        },
        returnObject
        );
    }
}
