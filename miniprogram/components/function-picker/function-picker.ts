Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: ''
    }
  },

  methods: {
    handleMonitor() {
      this.triggerEvent('select', { type: 'camera' });
    },
    handlePolice() {
      this.triggerEvent('select', { type: 'policeStation' });
    }
  }
})
