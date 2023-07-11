---
title: Languages available
aside: false
---

<script lang='ts' setup>
import PageLanguages from '@/_comp/PageLanguages.vue'
</script>

<ClientOnly>
    <suspense>
        <template #fallback>
            <svg class='loading' viewBox='0 0 100 100' preserveAspectRatio='xMidYMid meet'>
                <circle cx='50' cy='50' r='40' stroke-width='10' stroke-dasharray='190'></circle>
            </svg>
        </template>
        <PageLanguages/>
    </suspense>
</ClientOnly>
