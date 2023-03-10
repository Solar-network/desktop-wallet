<template>
  <div class="TransactionFormVote">
    <Collapse
      :is-open="!isMnemonicStep"
      class="TransactionFormVote__block-producer-details"
    >
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
        <ListDividedItem
          v-if="Object.keys(votedBlockProducers).length"
          class="TransactionConfirmMultiPayment__recipients"
          :label="$t('TRANSACTION.VOTES')"
          item-value-class="items-center w-full"
        >
          <TransactionVotesList
            :title="null"
            :items="getVotes"
            :show-links="true"
            readonly
            @click="() => {}"
          />
        </ListDividedItem>
      </ListDivided>

      <button
        v-show="showVoteButton"
        type="button"
        class="blue-button mt-5"
        @click="toggleStep"
      >
        {{ Object.keys(votedBlockProducers).length === 0 ? $t('WALLET_BLOCK_PRODUCERS.CANCEL_VOTE') : $t('WALLET_BLOCK_PRODUCERS.VOTE') }}
      </button>
    </Collapse>

    <Collapse :is-open="isMnemonicStep">
      <div class="mt-12">
        <InputFee
          ref="fee"
          :currency="walletNetwork.token"
          :transaction-type="$options.transactionType"
          :show-insufficient-funds="true"
          class="TransactionFormVote__fee"
          @input="onFee"
        />
      </div>

      <div v-if="!isMultiSignature">
        <div
          v-if="currentWallet.isLedger"
          class="TransactionFormVote__ledger-notice mt-10"
        >
          {{ $t('TRANSACTION.LEDGER_SIGN_NOTICE') }}
        </div>

        <InputPassword
          v-else-if="currentWallet.mnemonic"
          ref="password"
          v-model="$v.form.walletPassword.$model"
          :label="$t('TRANSACTION.PASSWORD')"
          :is-required="true"
          class="TransactionFormVote__password mt-4"
        />

        <MnemonicInput
          v-else
          ref="mnemonic"
          v-model="$v.form.mnemonic.$model"
          :address="currentWallet.address"
          :pub-key-hash="walletNetwork.version"
          class="TransactionFormVote__mnemonic mt-4"
        />
      </div>

      <MnemonicInput
        v-if="currentWallet.secondPublicKey"
        ref="extraMnemonic"
        v-model="$v.form.extraMnemonic.$model"
        :label="$t('TRANSACTION.EXTRA_MNEMONIC')"
        :pub-key-hash="walletNetwork.version"
        :public-key="currentWallet.secondPublicKey"
        class="TransactionFormVote__extra-mnemonic mt-5"
      />

      <button
        :disabled="$v.form.$invalid"
        type="button"
        class="TransactionFormVote__next blue-button mt-5"
        @click="onSubmit"
      >
        {{ $t('COMMON.NEXT') }}
      </button>
    </Collapse>

    <ModalLoader
      ref="modalLoader"
      :message="$t('ENCRYPTION.DECRYPTING')"
      :visible="showEncryptLoader"
    />
    <ModalLoader
      :message="$t('TRANSACTION.LEDGER_SIGN_WAIT')"
      :visible="showLedgerLoader"
    />
  </div>
</template>

<script>
import { TRANSACTION_TYPES } from "@config";
import { Collapse } from "@/components/Collapse";
import { InputFee, InputPassword } from "@/components/Input";
import { ListDivided, ListDividedItem } from "@/components/ListDivided";
import TransactionVotesList from "@/components/Transaction/TransactionVotesList";
import { ModalLoader } from "@/components/Modal";
import { MnemonicInput } from "@/components/Mnemonic";
import mixin from "./mixin";

export default {
    name: "TransactionFormVote",

    transactionType: TRANSACTION_TYPES.GROUP_1.VOTE,

    components: {
        Collapse,
        InputFee,
        InputPassword,
        ListDivided,
        ListDividedItem,
        ModalLoader,
        MnemonicInput,
        TransactionVotesList
    },

    mixins: [mixin],

    props: {
        votedBlockProducers: {
            type: Object,
            required: false,
            default: null
        }
    },

    data: () => ({
        isMnemonicStep: false,
        form: {
            fee: 0,
            mnemonic: "",
            walletPassword: ""
        }
    }),

    computed: {
        getVotes () {
            return Object.entries(this.votedBlockProducers).map(vote => ({ address: this.$store.getters["blockProducer/byUsername"](vote[0]).address, blockProducer: vote[0], percent: vote[1] / 100 }));
        },

        showVoteButton () {
            if (this.currentWallet.isContact) {
                return false;
            }

            return true;
        }
    },

    watch: {
        isMnemonicStep () {
            // Ignore Ledger wallets
            if (this.currentWallet.isLedger || this.isMultiSignature) {
                return;
            }

            // The mnemonic is stored: focus on the custom password input
            if (this.currentWallet.mnemonic) {
                this.$refs.password.focus();
            } else {
                this.$refs.mnemonic.focus();
            }
        }
    },

    methods: {
        getTransactionData () {
            const votes = {};
            for (const blockProducer in this.votedBlockProducers) {
                votes[blockProducer] = this.votedBlockProducers[blockProducer] / 100;
            }
            const transactionData = {
                address: this.currentWallet.address,
                mnemonic: this.form.mnemonic,
                votes,
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
            return this.$client.buildVote(transactionData, isAdvancedFee, returnObject);
        },

        transactionError () {
            this.$error(this.$t("TRANSACTION.ERROR.VALIDATION.VOTE"));
        },

        postSubmit () {
            this.reset();
        },

        toggleStep () {
            this.isMnemonicStep = !this.isMnemonicStep;
        },

        reset () {
            this.isMnemonicStep = false;
            if (!this.isMultiSignature) {
                if (!this.currentWallet.mnemonic && !this.currentWallet.isLedger) {
                    this.$set(this.form, "mnemonic", "");
                    this.$refs.mnemonic.reset();
                } else if (!this.currentWallet.isLedger) {
                    this.$set(this.form, "walletPassword", "");
                    this.$refs.password.reset();
                }
            }
            this.$v.$reset();
        },

        emitCancel () {
            this.$emit("cancel", "navigateToTransactions");
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

<style scoped>
.TransactionFormVote {
  min-width: 29em;
}

.TransactionFormVote /deep/ .Collapse__handler {
  display: none
}
</style>
