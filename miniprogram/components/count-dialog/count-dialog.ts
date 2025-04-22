Component({
  properties: {
    statistics: {
      type: Array,
      value: [],
    },
    showDialog: {
      type: Boolean,
      value: false,
    }
  },

  methods: {
    closeDialog() {
      // 关闭弹窗
      this.triggerEvent('close');
      
    }
  }
});
