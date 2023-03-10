<template>
  <div class="MnemonicWords h-full w-full flex flex-wrap">
    <InputText
      v-for="(word, index) in mnemonicWords"
      :key="index"
      :is-read-only="true"
      :label="(index + 1).toString()"
      :name="`word-${index}`"
      :value="word"
    />
  </div>
</template>

<script>
import { InputText } from "@/components/Input";

export default {
    name: "MnemonicWords",

    components: {
        InputText
    },

    props: {
        mnemonicWords: {
            type: Array,
            required: true
        }
    }
};
</script>

<style lang="postcss">
.MnemonicWords .InputText {
  width: calc(config('width.1/4') - config('margin.2'));
  @apply mr-2
}

.MnemonicWords .InputText__input[disabled] {
  @apply .bg-transparent
}
</style>
