var combo_domain, combo_site, layer_date, chart_section, chart_average, table_detail;
var site_info = {}, active_hour = new Date().getHours();

var chart_styles = {
    axisBorderColor : "#dcdcdc",
    axisBorderWidth : 1,
    axisBorderRadius : 5,
    titleFontWeight : "bold"
};

var chart_names = {
    resp_time: "Response",
    dns_time: "DNS",
    socket_time: "Socket",
    request_time: "Request",
    first_byte_time: "First Byte",
    download_time: "Download"
};

jui.ready([ "ui.combo", "ui.datepicker", "chart.builder", "grid.xtable" ], function(combo, datepicker, builder, xtable) {
    combo_domain = combo("#combo_domain", {
        width: 150,
        event: {
            change: function(data) {
                updateSiteInfo();
            }
        }
    });

    combo_site = combo("#combo_site", {
        width: 200
    });

    layer_date = datepicker("#datepicker", {
        titleFormat: "yyyy. MM",
        format: "yyyy/MM/dd",
        event: {
            select: function(date, e) {
                $("#btn_date").find("span").html(date);
                $(layer_date.root).hide();
            }
        },
        tpl: {
            date: $("#tpl_date").html()
        }
    });

    chart_section = builder("#chart_section", {
        padding : 0,
        axis : [{
            padding : {
                left : 30,
                top : 50,
                right : 50,
                bottom : 50
            }
        }],
        brush : [{
            type : "pie",
            target : [ "dns_time", "socket_time", "request_time", "first_byte_time", "download_time" ],
            showText : "outside",
            active : "resp_time",
            activeEvent : "click",
            colors : [ 1, 2, 3, 4, 5 ],
            format : function(k, v) {
                var d = this.axis(0).data[0],
                    t = d.dns_time + d.socket_time + d.resp_time + d.first_byte_time + d.download_time;

                return chart_names[k] + " (" + Math.round((v / t) * 100) + "%)";
            }
        }],
        widget : [{
            type : "legend",
            orient : "right",
            align : "end",
            format : function(k) {
                return chart_names[k];
            }
        }],
        event : {
            click: function(obj, e) {
                setHourlyChartTarget(obj.dataKey);
            },
            "chart.click": function(e) {
                if(e.target.nodeName == "rect") {
                    setHourlyChartTarget("resp_time");
                }
            },
            "bg.click": function(e) {
                if(e.target.nodeName == "rect") {
                    setHourlyChartTarget("resp_time");
                }
            }
        },
        style : chart_styles,
        render : false
    });

    chart_average = builder("#chart_average", {
        padding : {
            left : 30,
            top : 0,
            bottom : 0,
            right : 0
        },
        axis : [{
            x : {
                type : "fullblock",
                domain : function() {
                    var res = [];

                    for(var i = 0; i < 25; i++) {
                        res.push((i < 10) ? "0" + i : "" + i);
                    }

                    return res;
                },
                line : true
            },
            y : {
                type : "range",
                domain : function(d) {
                    return getChartTarget(d.resp_time);
                },
                step : 4,
                line : true,
                orient : "right"
            },
            padding : 50
        }],
        brush : [{
            type : "column",
            target : [ "resp_time" ],
            activeEvent : "click",
            active : active_hour
        }],
        widget : [{
            type : "title",
            text : "Hourly Response Time (ms)",
            align : "start",
            dx : 10
        }, {
            type : "tooltip",
            all : true,
            format : function(data, key) {
                return {
                    key: chart_names[key] + " Time",
                    value: data[key].toLocaleForJennifer() + "ms"
                }
            }
        }],
        format : function(d) {
            if(typeof(d) == "number") {
                return d.toLocaleForJennifer();
            }

            return d;
        },
        event : {
            click: function(d) {
                active_hour = d.dataIndex;
                updateMeasureTable();
            }
        },
        style : chart_styles,
        render : false
    });

    table_detail = xtable("#table_detail", {
        fields: [
            "equip_name", null, null, "measure_unix_time", "result_status_str",
            "resp_time", "dns_time", "socket_time", "request_time", "first_byte_time", "download_time",
            "in_bytes", "n_total_component", "n_fail_component"
        ],
        resize: true,
        sort: [ 0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 ],
        buffer: "vscroll",
        rowHeight: 26,
        scrollHeight: $(window).height() - 600,
        tpl: {
            row: $("#tpl_row").html(),
            none: $("#tpl_none").html()
        },
        event: {
            sort: setSortEff
        }
    });

    $("#btn_date").on("click", function(e) {
        if($(layer_date.root).css("display") == "none") {
            $(layer_date.root).css({
                left: 485,
                top: 31
            }).show();
        } else {
            $(layer_date.root).hide();
        }
    });

    $("#btn_date").find("span").html(layer_date.getFormat());

    $("#btn_search").on("click", function(e) {
        updateDailyChart();
        updateHourlyChart();
        updateMeasureTable();
    });

    updateSiteInfo();
});

function updateSiteInfo() {
    $.get("/plugin/argos/daily", {
        domain_id: combo_domain.getValue(),
        time: layer_date.getTime()
    }, function(list) {
        $(combo_site.root).find("ul").html("");

        if(list.length == 0) {
            $(combo_site.root).find(".btn:first-child").html("No data");
        } else {
            for(var i = 0; i < list.length; i++) {
                var k = list[i].site_code;
                site_info[k] = list[i];

                $(combo_site.root).find("ul").append("<li value='" + k + "'>" + list[i].site_name + "</li>")
            }
        }

        combo_site.reload();
    });
}

function updateDailyChart() {
    var data = site_info[combo_site.getValue()];
    if(!data) return;

    chart_section.axis(0).update([ data ]);
    chart_section.render();
}

function updateHourlyChart() {
    var site_code = combo_site.getValue();
    if(!site_code) return;

    $.get("/plugin/argos/hourly", {
        domain_id: combo_domain.getValue(),
        site_code: site_code,
        time: layer_date.getTime()
    }, function(list) {
        chart_average.axis(0).update(list);
        chart_average.render();
    });
}

function updateMeasureTable() {
    var site_code = combo_site.getValue();
    if(!site_code) return;

    var time_ranges = getMeasureDates();

    $.get("/plugin/argos/measure", {
        domain_id: combo_domain.getValue(),
        site_code: site_code,
        stime: time_ranges[0],
        etime: time_ranges[1]
    }, function(list) {
        table_detail.update(list);
    });
}

function getTargetIndex(target) {
    var index = 0,
        targets = [
            "resp_time",
            "dns_time",
            "socket_time",
            "request_time",
            "first_byte_time",
            "download_time"
        ];

    for(var i = 0; i < targets.length; i++) {
        if(targets[i] == target) {
            index = i;
            break;
        }
    }

    return index;
}

function getMeasureDates() {
    var now = new Date(layer_date.getTime());
    now.setHours(active_hour);

    console.log(new Date(now.getTime()).format("yyyymmdd HH:mm:ss"), new Date(now.getTime() + (1000 * 60 * 60)).format("yyyymmdd HH:mm:ss"));
    return [ now.getTime(), now.getTime() + (1000 * 60 * 60) ]
}

function showServerData(index) {
    var data = table_detail.get(index).data,
        time_ranges = getMeasureDates();

    jennifer.ui.getXivewPointList(combo_domain.getValue(), data.tx_id_list, time_ranges[0], time_ranges[1]);
}

function showFrontData(index) {
    var data = table_detail.get(index).data;

    window.open("http://argos-demo.vivans.net/web/analysis/ComponentAnalDetail:popup.argos?txid=" + data.tx_id_list[0], "argosDetailPopup", "scrollbars=yes,toolbar=yes,resizable=yes,width=1280,height=768");
}

function setHourlyChartTarget(dataKey) {
    // daily 차트 선택 효과 제거
    chart_section.updateBrush(0, {
        active : dataKey
    });
    chart_section.render();

    // hourly 차트 타겟 response로 변경
    chart_average.updateBrush(0, {
        active : active_hour,
        target : [ dataKey ],
        colors : [ getTargetIndex(dataKey) ]
    });
    chart_average.updateWidget(0, {
        text : "Hourly " + chart_names[dataKey] + " Time (ms)"
    });
    chart_average.axis(0).set("y", {
        domain : function(d) {
            return getChartTarget(d[dataKey]);
        }
    });
    chart_average.render(true);
}
