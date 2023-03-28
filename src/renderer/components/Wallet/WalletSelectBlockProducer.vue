<template>
  <ModalWindow
    :title="$t('WALLET_BLOCK_PRODUCERS.SEARCH_BLOCK_PRODUCER')"
    container-classes="SelectBlockProducerModal"
    @close="emitCancel"
  >
    <div class="flex flex-col justify-center">
      <InputBlockProducer
        ref="blockProducer"
        v-model="$v.form.blockProducer.$model"
        class="mt-5"
        :helper-text="$t('INPUT_BLOCK_PRODUCER.SEARCH_HINT')"
        @valid="onValid"
        @keyup.esc.native="emitCancel"
        @keyup.enter.native="emitConfirm"
      />

      <button
        :disabled="$v.form.$invalid"
        class="blue-button mt-5"
        type="button"
        @click="emitConfirm"
      >
        {{ $t('COMMON.CONFIRM') }}
      </button>
    </div>
  </ModalWindow>
</template>

<script>
import { InputBlockProducer } from "@/components/Input";
import { ModalWindow } from "@/components/Modal";

export default {
    name: "ModalSelectBlockProducer",

    components: {
        InputBlockProducer,
        ModalWindow
    },

    data: () => ({
        form: {
            blockProducer: ""
        },
        isValid: false
    }),

    methods: {
        emitCancel () {
            this.$emit("cancel");
        },

        emitConfirm () {
            this.$emit("confirm", this.$v.form.blockProducer.$model);
        },

        onValid (value) {
            this.isValid = value;
        }
    },

    validations: {
        form: {
            blockProducer: {
                isValid () {
                    return this.isValid;
                }
            }
        }
    }
};
</script>

<style lang="postcss">
.SelectBlockProducerModal {
  @apply .overflow-visible;
  min-width: 35rem;
}
.SelectBlockProducerModal .ModalWindow__container__content {
  @apply .overflow-visible;
}
</style>
