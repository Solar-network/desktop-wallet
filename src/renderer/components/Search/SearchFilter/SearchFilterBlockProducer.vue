<template>
  <SearchFilterItem :label="$t('SEARCH.BLOCK_PRODUCER')">
    BlockProducer
  </SearchFilterItem>
</template>

<script>
import SearchFilterItem from "./SearchFilterItem";

export default {
    name: "SearchFilterBlockProducer",

    components: {
        SearchFilterItem
    }
};
</script>
