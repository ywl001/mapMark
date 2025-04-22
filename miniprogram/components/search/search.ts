import cloudFunctions from "../../utils/cloud-functions";
import { AppEvent } from "../../utils/event-bus/event-type";
import EventBus from "../../utils/event-bus/EventBus";

// components/search/search.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {

  },

  /**
   * 组件的初始数据
   */
  data: {
    showResults: false, // 是否显示查询结果
    results: [] as any[], // 查询结果数组
    keyword: '',
    resultMap:{} as any
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 输入事件
    onInput(e: any) {
      const keyword = e.detail.value;
      this.setData({
        keyword
      });
      if (keyword.length >= 2) {
        this.fetchResults(keyword);
      } else {
        this.setData({
          results: [],
          showResults: false
        });
      }
    },

    // 获取焦点事件
    onFocus() {
      if (this.data.results.length > 0) {
        this.setData({
          showResults: true
        });
      }
    },

    // 清除搜索框内容
    clearSearch() {
      this.setData({
        searchQuery: '',
        results: [],
        showResults: false
      });
      EventBus.emit(AppEvent.CLEAR_SEARCH_MARKER)
    },

    // 获取查询结果
    fetchResults(keyword: string) {
      const res = this.data.resultMap[keyword]
      if(res && res.length > 0){
        console.log('从map中获取结果,res',res)
        this.setData({
          results: res,
          showResults: true,
        });
      }else{
        const wdb = wx.cloud.database();
        const query = { name: wdb.RegExp({ regexp: keyword }) }
  
        cloudFunctions.getData("mark", query, 100).then((res: any) => {
          console.log(res)

          this.data.resultMap[keyword] = res;
  
          this.setData({
            results: res,
            showResults: res.length > 0,
          });
        })
      }
    },

    onClickItem(e: any) {
      const item = e.currentTarget.dataset.item;
      EventBus.emit(AppEvent.SEARCH_MARKER, [item])
      this.setData({
        showResults: false
      })
    },

    onSearch() {
      if (this.data.results.length > 0)
        EventBus.emit(AppEvent.SEARCH_MARKER, this.data.results)
      this.setData({
        showResults: false
      })
    }
  }
})