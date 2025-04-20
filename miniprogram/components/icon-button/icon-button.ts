Component({
  properties: {
    src: String, // 默认图片
    pressedSrc: String, // 按下时替换图标（可选）
    size: {
      type: Number,
      value: 40, // 默认 64rpx
    }
  },

  data: {
    pressed: false
  },

  methods: {
    onTouchStart() {
      this.setData({ pressed: true });
    },
    onTouchEnd() {
      this.setData({ pressed: false });
    },
    // onTap() {
    //   // this.triggerEvent('tap'); // 触发外部事件
    // }
  }
});
