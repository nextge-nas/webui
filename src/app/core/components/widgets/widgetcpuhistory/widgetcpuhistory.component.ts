import { Component, AfterViewInit, Input, ViewChild, OnDestroy} from '@angular/core';
import { CoreServiceInjector } from 'app/core/services/coreserviceinjector';
import { CoreService, CoreEvent } from 'app/core/services/core.service';
import { MaterialModule } from 'app/appMaterial.module';
import { NgForm } from '@angular/forms';
import { ChartData } from 'app/core/components/viewchart/viewchart.component';

import { Router } from '@angular/router';
import { UUID } from 'angular2-uuid';
import * as d3 from 'd3';
import * as c3 from 'c3';

//import { ViewChartLineComponent } from 'app/core/components/viewchartline/viewchartline.component';
import { AnimationDirective } from 'app/core/directives/animation.directive';
import filesize from 'filesize';
import { WidgetComponent } from 'app/core/components/widgets/widget/widget.component';
import { TranslateService } from '@ngx-translate/core';

import { T } from '../../../../translate-marker';

interface TimeData {
  start: number;
  end: number;
  step: number;
  legend?: string;
}

@Component({
  selector: 'widget-cpu-history',
  templateUrl:'./widgetcpuhistory.component.html',
  styleUrls: ['./widgetcpuhistory.component.css']
})
export class WidgetCpuHistoryComponent extends WidgetComponent implements AfterViewInit, OnDestroy {

  //@ViewChild('chartCpu') chartCpu: ViewChartLineComponent;
  public title:string = T("CPU Usage");
  public subtitle:string = T("% of all cores");
  public altTitle: string = '';
  public altSubtitle: string = '';
  public showLegendValues:boolean = false;
  public chartId = "chart-" + UUID.UUID();
  public chart: any;

  public startTime;
  public endTime;

  constructor(public router: Router, public translate: TranslateService){
    super(translate);
  }

  ngOnDestroy(){
    this.core.emit({name:"StatsRemoveListener", data:{name:"CpuAggregate", obj:this}});
  }

  ngAfterViewInit(){
    //this.core.emit({name:"StatsAddListener", data:{name:"CpuAggregate",key:"sum", obj:this} });
    this.core.emit({name:"StatsAddListener", data:{name:"CpuAggregate",key:"average", obj:this} });
    this.core.register({observerClass:this,eventName:"StatsCpuData"}).subscribe((evt:CoreEvent) => {
      //DEBUG: console.log(evt);
      //this.setCPUData(evt);
      });

    /*this.core.register({observerClass:this,eventName:"StatsCpuAggregateSum"}).subscribe((evt:CoreEvent) => {
     //DEBUG: console.log(evt);
     this.setCPUData(evt);
    });*/

    this.core.register({observerClass:this,eventName:"StatsCpuAggregateAverage"}).subscribe((evt:CoreEvent) => {
      //DEBUG: console.log(evt);
      this.setCPUData(evt);
    });

    this.core.register({observerClass:this, eventName:"ThemeChanged"}).subscribe(() => {
      //this.chartCpu.refresh();
      });

    //this.core.emit({name:"StatsCpuRequest", data:[['user','interrupt','system'/*,'idle','nice'*/],{step:'10', start:'now-10m'}]});

    this.chartSetup()
  }

  chartSetup(){
    this.chart = c3.generate({
      bindto: '#' + this.chartId,
      size: {
        height:176
      },
      data: {
        x: "x",
        columns: [
          ['x'],
          ['user']
        ],
        type: 'spline',
        colors: {
          user:"var(--primary)"
        },
        onmouseout: (d) => {
          this.showLegendValues = false;
        }
      },
      axis: {
        x: {
          show:false,
          type: 'timeseries',
          tick: {
            count: 2,
            fit:true,
            format: '%H:%M'
          }
        },
        y: {
          show:true,
          inner:true,
          //max: 100,
          tick: {
            count:2,
            values: [0, 100],
            format: (y) => { return y + "%" }
          }
        }
      },
      legend: {
        show: false
      },
      tooltip: {
        //show: false,
        contents: (raw, defaultTitleFormat, defaultValueFormat, color) => {
          if(!this.showLegendValues){
           this.showLegendValues = true;
          }
          this.altTitle = raw[0].value + "% CPU";
          this.altSubtitle = raw[0].x;
          
          //console.log("******** TOOLTIP VALUES ********");
          /*for(let index = 0; index < this.legend.length; index++){
            //console.log("Looking for value");
            for(let i = 0; i < raw.length; i++){
              if(this.legend[index].name == raw[i].name){
                this.legend[index].value = raw[i].value;
                //DEBUG: console.log(this.legend);
              }
            }
            this.legend[index].x = time;
          }*/
          return '<div style="display:none">' + raw[0].x + '</div>';
        }
      }
    });
  }

  setCPUData(evt:CoreEvent){
    console.log("SET CPU DATA");
    console.log(evt.data);

    let parsedData = [];
    let dataTypes = [];
    dataTypes = evt.data.meta.legend;
    //dataTypes.push(evt.data.meta.legend[0]);

    for(let index in dataTypes){
      let chartData:ChartData = {
        legend: dataTypes[index],
        data:[]
      }
      for(let i in evt.data.data){
        chartData.data.push(evt.data.data[i][index])
      }
      parsedData.push(chartData);
    }

    console.log(parsedData);
    let xColumn = this.makeTimeAxis(evt.data.meta, parsedData);
    parsedData[0].data.unshift("user");

    this.startTime = this.timeFromDate(xColumn[1]);

    this.endTime = this.timeFromDate(xColumn[xColumn.length - 1]);

    console.log(xColumn);
    console.log(parsedData[0].data);

    this.chart.load({
      columns: [
        xColumn,
        parsedData[0].data
      ]
    });
    console.warn(this.chart)
  }

  protected makeTimeAxis(td:TimeData, data:any,  axis?: string):any[]{
    if(!axis){ axis = 'x';}
      let labels: any[] = [axis];
    console.log(td);
    data[0].data.forEach((item, index) =>{
      let date = new Date(td.start * 1000 + index * td.step * 1000);
      labels.push(date);
    });

    return labels;
  }

  /*setCPUData(evt:CoreEvent){
   console.log("SET CPU DATA");
   console.log(evt.data);
   let cpuUserObj = evt.data;

   let parsedData = [];
   let dataTypes = [];
   //dataTypes = evt.data.meta.legend;
   console.log(xColumn);
   dataTypes.push(evt.data.meta.legend[0]);

   for(let index in dataTypes){
     let chartData:ChartData = {
       legend: dataTypes[index],
       data:[]
     }
     for(let i in evt.data.data){
       chartData.data.push(evt.data.data[i][index])
     }
     parsedData.push(chartData);
   }

   this.chartCpu.chartType = 'spline';
   this.chartCpu.units = '%';
   this.chartCpu.timeSeries = true;
   this.chartCpu.timeFormat = '%H:%M';// eg. %m-%d-%Y %H:%M:%S.%L
     this.chartCpu.timeData = evt.data.meta;
   this.chartCpu.data = parsedData;//[cpuUser];
   //this.chartCpu.width = this.chartSize;
   //this.chartCpu.height = 160;

   this.chartCpu.refresh();
   console.log(this.chartCpu);
  }*/

  timeFromDate(date:Date){
    let hh = date.getUTCHours().toString();
    let mm = date.getUTCMinutes().toString();

    if(hh.length < 2){
      hh = "0" + hh
    }
    if(mm.length < 2){
      mm = "0" + mm
    }
    return hh + ":" + mm;
  }

  setPreferences(form:NgForm){
    let filtered: string[] = [];
    for(let i in form.value){
      if(form.value[i]){
        filtered.push(i);
      }
    }
  }

}
