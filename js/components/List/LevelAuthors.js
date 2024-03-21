export default {
    props: {
        author: {
            type: String,
            required: true,
        },
        creators: {
            type: Array,
            required: true,
        },
        verifier: {
            type: String,
            required: true,
        },
        isVerified:{
          type: Boolean,
          required: true
        }
    },
    template: `
        <div class="level-authors">
            <div class="type-title-sm">Level Author</div>
            <p class="type-body">
                <span>{{ author }}</span>
            </p>
            <div class="type-title-sm">
                <template v-if="isVerified == true">
                    Verified By
                </template>
                <template v-else>
                    To Be Verified By
                </template>
            </div>
            <p class="type-body">
                <span>{{ verifier }}</span>
            </p>
        </div>
    `,

    computed: {
        selfVerified() {
            return this.author === this.verifier && this.creators.length === 0;
        },
    },
};
