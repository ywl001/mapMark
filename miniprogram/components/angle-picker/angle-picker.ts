Component({

  properties: {
    // 允许外部设置初始角度
    'initialAngle': {
      type: Number,
      value: 0  // 默认初始角度为 0
    }
  },

  data: {
    angle: 0,
    centerX: 0,
    centerY: 0,
  },

  lifetimes: {
    ready() {
      const query = this.createSelectorQuery();
      query.select('.container').boundingClientRect((rect) => {
        this.setData({
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
          angle: this.data.initialAngle
        });
      }).exec();
    }
  },

  methods: {
    onTouchStart(e:any) {
      this.updateAngle(e.touches[0]);
    },
    onTouchMove(e:any) {
      this.updateAngle(e.touches[0]);
    },

    onTouchEnd() {
      this.triggerEvent('angleChanged', { angle: this.data.angle });
    },

    updateAngle(e:any) {
      const { clientX, clientY } = e;
      const dx = clientX - this.data.centerX;
      const dy = clientY - this.data.centerY;

      // 角度转换
      let angle = Math.atan2(dy, dx) * 180 / Math.PI;

      angle = angle + 90; // 让默认方向向上

      if (angle < 0) angle += 360;
      angle = Math.round(angle); 
      this.setData({angle });
    }
  }
});
