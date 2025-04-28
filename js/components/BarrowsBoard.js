const BarrowsBoard = {
    template: `
    <div class="barrows-board">
      <h2>Barrows Set Progress</h2>
      <div class="barrows-grid">
        <div v-for="row in 4" :key="'row-' + (row-1)" class="barrows-row">
          <div v-for="col in 6" 
               :key="'cell-' + (row-1) + '-' + (col-1)" 
               class="barrows-cell"
               :class="{ 
                 completed: isCompleted(row-1, col-1),
                 'readonly-cell': readonly
               }"
               @click="!readonly && toggleCompletion(row-1, col-1)">
            
            <img :src="getImageUrl(row-1, col-1)" 
                 @load="onImageLoaded($event, row-1, col-1)"
                 @error="onImageError($event, row-1, col-1)"
                 class="barrows-image">
            
            <div v-if="isCompleted(row-1, col-1)" class="completion-x"></div>
          </div>
        </div>
      </div>
    </div>
  `,

    props: {
        completionState: {
            type: Array,
            required: true
        },
        readonly: {
            type: Boolean,
            default: false
        }
    },

    emits: ['completion-changed'],

    data() {
        return {
            barrowsPieceImageUrls: {
                "0,0": "https://oldschool.runescape.wiki/images/thumb/Ahrim%27s_hood_detail.png/800px-Ahrim%27s_hood_detail.png",
                "1,0": "https://oldschool.runescape.wiki/images/thumb/Ahrim%27s_robetop_detail.png/1280px-Ahrim%27s_robetop_detail.png",
                "2,0": "https://oldschool.runescape.wiki/images/thumb/Ahrim%27s_robeskirt_detail.png/800px-Ahrim%27s_robeskirt_detail.png",
                "3,0": "https://oldschool.runescape.wiki/images/thumb/Ahrim%27s_staff_detail.png/800px-Ahrim%27s_staff_detail.png",

                "0,1": "https://oldschool.runescape.wiki/images/thumb/Dharok%27s_helm_detail.png/800px-Dharok%27s_helm_detail.png",
                "1,1": "https://oldschool.runescape.wiki/images/thumb/Dharok%27s_platebody_detail.png/1024px-Dharok%27s_platebody_detail.png",
                "2,1": "https://oldschool.runescape.wiki/images/Dharok%27s_platelegs_detail.png",
                "3,1": "https://oldschool.runescape.wiki/images/thumb/Dharok%27s_greataxe_detail.png/1024px-Dharok%27s_greataxe_detail.png",

                "0,2": "https://oldschool.runescape.wiki/images/thumb/Guthan%27s_helm_detail.png/1024px-Guthan%27s_helm_detail.png",
                "1,2": "https://oldschool.runescape.wiki/images/thumb/Guthan%27s_platebody_detail.png/800px-Guthan%27s_platebody_detail.png",
                "2,2": "https://oldschool.runescape.wiki/images/Guthan%27s_chainskirt_detail.png",
                "3,2": "https://oldschool.runescape.wiki/images/thumb/Guthan%27s_warspear_detail.png/800px-Guthan%27s_warspear_detail.png",

                "0,3": "https://oldschool.runescape.wiki/images/Karil%27s_coif_detail.png",
                "1,3": "https://oldschool.runescape.wiki/images/thumb/Karil%27s_leathertop_detail.png/1280px-Karil%27s_leathertop_detail.png",
                "2,3": "https://oldschool.runescape.wiki/images/thumb/Karil%27s_leatherskirt_detail.png/800px-Karil%27s_leatherskirt_detail.png",
                "3,3": "https://oldschool.runescape.wiki/images/thumb/Karil%27s_crossbow_detail.png/1024px-Karil%27s_crossbow_detail.png",

                "0,4": "https://oldschool.runescape.wiki/images/thumb/Torag%27s_helm_detail.png/1280px-Torag%27s_helm_detail.png",
                "1,4": "https://oldschool.runescape.wiki/images/thumb/Torag%27s_platebody_detail.png/1024px-Torag%27s_platebody_detail.png",
                "2,4": "https://oldschool.runescape.wiki/images/Torag%27s_platelegs_detail.png",
                "3,4": "https://oldschool.runescape.wiki/images/thumb/Torag%27s_hammers_detail.png/1280px-Torag%27s_hammers_detail.png",

                "0,5": "https://oldschool.runescape.wiki/images/thumb/Verac%27s_helm_detail.png/800px-Verac%27s_helm_detail.png",
                "1,5": "https://oldschool.runescape.wiki/images/thumb/Verac%27s_brassard_detail.png/800px-Verac%27s_brassard_detail.png",
                "2,5": "https://oldschool.runescape.wiki/images/thumb/Verac%27s_plateskirt_detail.png/1024px-Verac%27s_plateskirt_detail.png",
                "3,5": "https://oldschool.runescape.wiki/images/thumb/Verac%27s_flail_detail.png/800px-Verac%27s_flail_detail.png"
            },

            barrowsSetImageUrls: {
                0: "https://oldschool.runescape.wiki/images/Ahrim%27s_robes_equipped_male.png",
                1: "https://oldschool.runescape.wiki/images/Dharok%27s_armour_equipped_male.png",
                2: "https://oldschool.runescape.wiki/images/Guthan%27s_armour_equipped_male.png",
                3: "https://oldschool.runescape.wiki/images/Karil%27s_armour_equipped_male.png",
                4: "https://oldschool.runescape.wiki/images/Torag%27s_armour_equipped_male.png",
                5: "https://oldschool.runescape.wiki/images/Verac%27s_armour_equipped_male.png"
            },

            localCompletionState: []
        };
    },

    created() {
        this.localCompletionState = this.completionState.map(row => [...row]);
    },

    methods: {
        getImageUrl(row, col) {
            const key = `${row},${col}`;
            return this.barrowsPieceImageUrls[key];
        },

        isCompleted(row, col) {
            return this.localCompletionState[row] && this.localCompletionState[row][col];
        },

        toggleCompletion(row, col) {
            if (this.readonly) return;

            this.localCompletionState[row][col] = !this.localCompletionState[row][col];

            const completedColumn = this.getCompletedColumn();
            const isAnyColumnComplete = completedColumn >= 0;

            this.$emit('completion-changed', {
                newState: this.localCompletionState,
                isAnyColumnComplete,
                completedColumn
            });
        },

        getCompletedColumn() {
            for (let col = 0; col < 6; col++) {
                let isComplete = true;

                for (let row = 0; row < 4; row++) {
                    if (!this.localCompletionState[row][col]) {
                        isComplete = false;
                        break;
                    }
                }

                if (isComplete) return col;
            }

            return -1;
        },

        onImageLoaded(event, row, col) {
            const cell = event.target.closest('.barrows-cell');
            if (cell) {
                cell.classList.remove('loading');
                cell.classList.add('loaded');
            }
        },

        onImageError(event, row, col) {
            const cell = event.target.closest('.barrows-cell');
            if (cell) {
                cell.classList.remove('loading');
                cell.classList.add('error');
                console.error(`Failed to load image for cell ${row},${col}`);
            }
        }
    },

    watch: {
        completionState: {
            handler(newVal) {
                this.localCompletionState = newVal.map(row => [...row]);
            },
            deep: true
        }
    }
};

