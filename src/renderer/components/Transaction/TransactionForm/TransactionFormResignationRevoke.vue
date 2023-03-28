<template>
  <form
    class="TransactionFormResignation flex flex-col"
    @submit.prevent
  >
    <template v-if="canResign">
      <ListDivided :is-floating-label="true">
        <ListDividedItem
          :label="$t('TRANSACTION.SENDER')"
          item-value-class="w-full"
        >
          <span class="break-words">
            {{ senderLabel }}
          </span>
          <span
            v-if="senderLabel !== currentWallet.address"
            class="text-sm text-theme-page-text-light"
          >
            {{ currentWallet.address }}
          </span>
        </ListDividedItem>

        <ListDividedItem :label="$t('TRANSACTION.USERNAME')">
          {{ username }}
        </ListDividedItem>
      </ListDivided>

      <InputFee
        ref="fee"
        :currency="walletNetwork.token"
        :transaction-type="$options.transactionType"
        :show-insufficient-funds="true"
        class="TransactionFormResignation__fee"
        @input="onFee"
      />

      <div v-if="!isMultiSignature">
        <div
          v-if="currentWallet.isLedger"
          class="TransactionFormResignation__ledger-notice mt-10"
        >
          {{ $t('TRANSACTION.LEDGER_SIGN_NOTICE') }}
        </div>

        <InputPassword
          v-else-if="currentWallet.mnemonic"
          ref="password"
          v-model="$v.form.walletPassword.$model"
          :label="$t('TRANSACTION.PASSWORD')"
          :is-required="true"
          class="TransactionFormResignation__password mt-4"
        />

        <MnemonicInput
          v-else
          ref="mnemonic"
          v-model="$v.form.mnemonic.$model"
          :address="currentWallet.address"
          :pub-key-hash="walletNetwork.version"
          class="TransactionFormResignation__mnemonic mt-4"
        />
      </div>

      <MnemonicInput
        v-if="currentWallet.secondPublicKey"
        ref="extraMnemonic"
        v-model="$v.form.extraMnemonic.$model"
        :label="$t('TRANSACTION.EXTRA_MNEMONIC')"
        :pub-key-hash="walletNetwork.version"
        :public-key="currentWallet.secondPublicKey"
        class="TransactionFormResignation__extra-mnemonic mt-5"
      />

      <button
        :disabled="$v.form.$invalid"
        class="TransactionFormResignation__next blue-button mt-10 ml-0"
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

      <Portal to="transaction-footer">
        <footer class="ModalWindow__container__footer--warning">
          {{ $t('TRANSACTION.FOOTER_TEXT.RESIGNATION_REVOKE') }}
        </footer>
      </Portal>
    </template>
    <template v-else>
      {{ $t('WALLET_BLOCK_PRODUCERS.NOT_REGISTERED') }}
    </template>
  </form>
</template>

<script>
import { TRANSACTION_TYPES } from "@config";
import { InputFee, InputPassword } from "@/components/Input";
import { ListDivided, ListDividedItem } from "@/components/ListDivided";
import { ModalLoader } from "@/components/Modal";
import { MnemonicInput } from "@/components/Mnemonic";
import mixin from "./mixin";

export default {
    name: "TransactionFormResignationRevoke",

    transactionType: TRANSACTION_TYPES.GROUP_1.RESIGNATION,
    meta: 2,

    components: {
        InputFee,
        InputPassword,
        ListDivided,
        ListDividedItem,
        ModalLoader,
        MnemonicInput
    },

    mixins: [mixin],

    data: () => ({
        form: {
            fee: 0,
            mnemonic: "",
            walletPassword: ""
        }
    }),

    computed: {
        canResign () {
            if (this.username === null) {
                return false;
            }

            return this.currentWallet.isBlockProducer;
        },

        username () {
            const blockProducer = this.$store.getters["blockProducer/byAddress"](this.currentWallet.address);

            if (!blockProducer || !blockProducer.username) {
                return null;
            }

            return this.$store.getters["blockProducer/byAddress"](this.currentWallet.address).username;
        }
    },

    methods: {
        getTransactionData () {
            const transactionData = {
                address: this.currentWallet.address,
                resignationType: 2,
                mnemonic: this.form.mnemonic,
                fee: this.getFee(),
                wif: this.form.wif,
                networkWif: this.walletNetwork.wif,
                multiSignature: this.currentWallet.multiSignature
            };

            if (this.currentWallet.secondPublicKey) {
                transactionData.extraMnemonic = this.form.extraMnemonic;
            }

            return transactionData;
        },

        async buildTransaction (transactionData, isAdvancedFee = false, returnObject = false) {
            return this.$client.buildResignation(transactionData, isAdvancedFee, returnObject);
        },

        transactionError () {
            this.$error(this.$t("TRANSACTION.ERROR.VALIDATION.RESIGNATION"));
        }
    },

    validations: {
        form: {
            fee: mixin.validators.fee,
            mnemonic: mixin.validators.mnemonic,
            walletPassword: mixin.validators.walletPassword,
            extraMnemonic: mixin.validators.extraMnemonic
        }
    }
};
</script>
