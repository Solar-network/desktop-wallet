<template>
  <form
    class="TransactionFormMultiSign flex flex-col"
    @submit.prevent
  >
    <template>
      <div
        v-if="currentWallet.isLedger"
        class="TransactionFormMultiSign__ledger-notice mt-10"
      >
        {{ $t('TRANSACTION.LEDGER_SIGN_NOTICE') }}
      </div>

      <InputPassword
        v-else-if="currentWallet.mnemonic"
        ref="password"
        v-model="$v.form.walletPassword.$model"
        :label="$t('TRANSACTION.PASSWORD')"
        :is-required="true"
        class="TransactionFormMultiSign__password"
      />

      <MnemonicInput
        v-else
        ref="mnemonic"
        v-model="$v.form.mnemonic.$model"
        :address="currentWallet.address"
        :pub-key-hash="walletNetwork.version"
        class="TransactionFormMultiSign__mnemonic"
      />

      <MnemonicInput
        v-if="currentWallet.secondPublicKey"
        ref="extraMnemonic"
        v-model="$v.form.extraMnemonic.$model"
        :label="$t('TRANSACTION.EXTRA_MNEMONIC')"
        :pub-key-hash="walletNetwork.version"
        :public-key="currentWallet.secondPublicKey"
        class="TransactionFormMultiSign__extra-mnemonic mt-5"
      />

      <button
        :disabled="$v.form.$invalid"
        class="TransactionFormMultiSign__next blue-button mt-10 ml-0"
        @click="onSubmit"
      >
        {{ $t('COMMON.NEXT') }}
      </button>

      <ModalLoader
        ref="modalLoader"
        :message="$t('ENCRYPTION.DECRYPTING')"
        :visible="showEncryptLoader"
      />
      <ModalLoader
        :message="$t('TRANSACTION.LEDGER_SIGN_WAIT')"
        :visible="showLedgerLoader"
      />
    </template>
  </form>
</template>

<script>
import { TRANSACTION_TYPES } from "@config";
import { InputPassword } from "@/components/Input";
import { ModalLoader } from "@/components/Modal";
import { MnemonicInput } from "@/components/Mnemonic";
import mixin from "./mixin";

export default {
    name: "TransactionFormMultiSign",

    transactionType: TRANSACTION_TYPES.MULTI_SIGN,

    components: {
        InputPassword,
        ModalLoader,
        MnemonicInput
    },

    mixins: [mixin],

    props: {
        transaction: {
            type: Object,
            required: true
        }
    },

    data: () => ({
        form: {
            mnemonic: "",
            walletPassword: ""
        }
    }),

    methods: {
        getTransactionData () {
            const transactionData = {
                publicKey: this.currentWallet.publicKey,
                mnemonic: this.form.mnemonic,
                wif: this.form.wif,
                networkWif: this.walletNetwork.wif,
                multiSignature: this.transaction.multiSignature
            };

            if (this.currentWallet.secondPublicKey) {
                transactionData.extraMnemonic = this.form.extraMnemonic;
            }

            return transactionData;
        },

        async buildTransaction (transactionData) {
            return this.$client.multiSign(this.transaction, transactionData);
        },

        transactionError () {
            this.$error(this.$t("TRANSACTION.ERROR.VALIDATION.MULTI_SIGN"));
        }
    },

    validations: {
        form: {
            mnemonic: mixin.validators.mnemonic,
            walletPassword: mixin.validators.walletPassword,
            extraMnemonic: mixin.validators.extraMnemonic
        }
    }
};
</script>
