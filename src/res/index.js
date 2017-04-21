var combo_domain, layer_date, chart_average, table_detail, selectbox_site, range_slider, switch_chart;

var site_info = {};

var top_height = 300;

var chart_names = {
    resp_time: "Response",
    dns_time: "DNS",
    socket_time: "Socket",
    request_time: "Request",
    first_byte_time: "First Byte",
    download_time: "Download"
};

var chart_grid_colors = {
    jennifer: "#dcdcdc",
    dark: "#464646"
};

var chart_targets = [ "dns_time", "socket_time", "request_time", "first_byte_time", "download_time" ];

var chart_colors_1 = {
    jennifer: {
        area: [ "#d0aaeb" ],
        line: [ "#a255d7" ]
    },
    dark: {
        area: [ "#5e3879" ],
        line: [ "#a255d7" ]
    }
};

var chart_colors_2 = {
    jennifer: {
        area: [ "#ff9a89", "#f4dd7f", "#cabb89", "#7ff1d9", "#9fc9fa" ],
        line: [ "#ff3513", "#e9bb00", "#957713", "#00e4b4", "#3f94f6" ]
    },
    dark: {
        area: [ "#8d2817", "#826b0d", "#584917", "#0d7f67", "#2d5788" ],
        line: [ "#ff3513", "#e9bb00", "#957713", "#00e4b4", "#3f94f6" ]
    }
};

var chart_colors = {};

jui.ready([ "ui.combo", "ui.datepicker", "grid.table", "selectbox", "ui.slider", "ui.button" ],
    function(combo, datepicker, table, selectbox, slider, button) {

    switch_chart = button("#switch", {
        type: "radio",
        index: 0,
        event: {
            change: function(data) {
                initDailyChartType(data.index == 0 ? false : true);
                updateDailyChart();
            }
        }
    });

    combo_domain = combo("#combo_domain", {
        width: 150,
        event: {
            change: function(data) {
                updateSiteInfo();
                updateDailyChart();
            }
        }
    });

    layer_date = datepicker("#datepicker", {
        titleFormat: "yyyy. MM",
        format: "yyyy/MM/dd",
        event: {
            select: function(date, e) {
                $("#btn_date").find("span").html(date);
                $(layer_date.root).hide();

                updateSiteInfo();
                updateDailyChart();
            }
        },
        tpl: {
            date: $("#tpl_date").html()
        }
    });

    selectbox_site = selectbox("#selectbox_site", {
        title: window.message.sitemap,
        type: "single",
        width: "100%",
        height: top_height,
        search: true,
        event: {
            select: function(data, e) {
                updateDailyChart();
            }
        }
    });

    table_detail = table("#table_detail", {
        fields: [
            "equip_name", null, null, "measure_unix_time", "result_status_str",
            "in_bytes", "n_total_component", "n_fail_component",
            "resp_time", null

        ],
        resize: true,
        sort: [ 0, 3, 4, 5, 6, 7, 8 ],
        // scroll: true,
        // scrollHeight: $(window).height() - 600,
        tpl: {
            row: $("#tpl_row").html(),
            none: $("#tpl_none").html()
        },
        event: {
            sort: setSortEff,
            select : function(row, e) {
                this.select(row.index);
            }
        }
    });

    range_slider = slider("#slider", {
        type: "double",
        min: 0,
        max: 1000 * 60 * 60 * 24,
        step: 1000 * 60 * 60,
        tooltip: false,
        event: {
            change: function(data) {
                var stime = getTodayDates()[0].getTime();

                if(data.from < data.to) {
                    chart_average.axis(0).set("x", {
                        domain: [ new Date(stime + data.from), new Date(stime + data.to) ]
                    });

                    chart_average.render();
                }
            }
        }
    });

    $("#btn_date").on("click", function(e) {
        if($(layer_date.root).css("display") == "none") {
            $(layer_date.root).css({
                left: 237,
                top: 31
            }).show();
        } else {
            $(layer_date.root).hide();
        }
    });

    $("#btn_date").find("span").html(layer_date.getFormat());

    $("#btn_search").on("click", function(e) {
        updateDailyChart();
    });

    updateSiteInfo();

    initDailyChartType(false);
});

function updateSiteInfo() {
    var params = {
        domain_id: combo_domain.getValue(),
        customer_id: "jennifer"
    };

    console.log("사이트 맵 : " + JSON.stringify(params));

    $.get("/plugin/argos/sites", params, function(jsonStr) {
        if(jsonStr == "") return;

        var list = eval(jsonStr),
            items = [];

        for(var i = 0; i < list.length; i++) {
            var k = (list[i].step_code == null) ? list[i].site_code : list[i].site_code + ":" + list[i].step_code,
                name = (list[i].step_code == null) ? list[i].site_name : list[i].site_name + " (" + list[i].step_order + "." + list[i].step_name + ")";

            site_info[k] = list[i];
            items.push({
                text: name,
                value: k
            });
        }

        selectbox_site.update(items);
    });
}

function initDailyChartType(isResp) {
    var time = jui.include("util.time");

    var chart_common_opts = {
        theme : window.theme,
        height : top_height,
        padding : {
            left : 30,
            top : 0,
            bottom : 0,
            right : 0
        },
        axis : [{
            x : {
                type : "date",
                domain : [],
                interval : 1000 * 60 * 60,
                format : "HH",
                key : "date",
                line : "dashed"
            },
            y : {
                type : "range",
                step : 4
            },
            padding : 50
        }],
        format : function(d) {
            if(typeof(d) == "number") {
                return d.toLocaleForJennifer();
            }

            return d;
        },
        event : {
            click: function(obj) {
                if(obj.brush.type == "selectbox") {
                    updateMeasureTable(obj.data.start, obj.data.end);
                }
            },
            "legend.filter": function(targets) {
                this.axis(0).set("y", {
                    domain: function(d) {
                        var total = 0;

                        for(var i = 0; i < targets.length; i++) {
                            total += d[targets[i]];
                        }

                        return getChartTarget(total);
                    }
                });

                this.render();
            }
        },
        style : {
            axisBorderColor : chart_grid_colors[window.theme],
            axisBorderWidth : 1,
            axisBorderRadius : 5,
            titleFontWeight : "bold",
            lineBorderOpacity : 1,
            lineBorderWidth : 1,
            areaBackgroundOpacity : 1,
            focusBorderColor : "#9663f4",
            focusBorderWidth : 2,
            focusBackgroundOpacity : 0,
            gridTickBorderSize : 0,
            tooltipPointRadius : 0,
            tooltipPointBorderWidth : 0,
            crossBorderWidth : 0.5,
            crossBorderOpacity : 0.5
        },
        render : false
    };

    if(chart_average != null) {
        chart_average.destroy();
        chart_average = null;
        $("#chart_average").html("");
    }

    if(isResp) {
        chart_colors = chart_colors_1;

        chart_common_opts.axis[0].y.domain = function(d) {
            return d.resp_time * 1.1;
        };

        chart_average = jui.create("chart.builder", "#chart_average", $.extend(chart_common_opts, {
            brush : [{
                type : "area",
                target : [ "resp_time" ],
                colors : chart_colors[window.theme].area,
                line : false,
                opacity : 0
            }, {
                type : "line",
                target : [ "resp_time" ],
                colors : chart_colors[window.theme].line,
                opacity : 0
            }, {
                type : "area",
                target : [ "resp_time" ],
                colors : chart_colors[window.theme].area,
                line : false,
                opacity : 1
            }, {
                type : "line",
                target : [ "resp_time" ],
                colors : chart_colors[window.theme].line,
                opacity : 1
            }, {
                type : "line",
                target : [ "resp_time" ],
                colors : function() {
                    return "transparent";
                },
                opacity : 1,
                display : "max"
            }, {
                type : "focus",
                start : -1,
                end : -1
            }, {
                type : "selectbox"
            }],
            widget : [{
                type : "title",
                text : window.message.msg1 + "(ms)",
                align : "start",
                dx : 10
            }, {
                type : "cross",
                xFormat : function(d) {
                    return time.format(d, "hh:mm");
                },
                yFormat : function(d) {
                    return Math.round(d).toLocaleForJennifer();
                }
            }]
        }));
    } else {
        chart_colors = chart_colors_2;

        chart_common_opts.axis[0].y.domain = function(d) {
            return (d.dns_time + d.socket_time + d.request_time + d.first_byte_time + d.download_time) * 1.0;
        };

        chart_average = jui.create("chart.builder", "#chart_average", $.extend(chart_common_opts, {
            brush : [{
                type : "stackline",
                target : chart_targets,
                colors : chart_colors[window.theme].line,
                opacity : 0
            }, {
                type : "stackarea",
                target : chart_targets,
                colors : chart_colors[window.theme].area,
                line : false,
                opacity : 0
            }, {
                type : "stackarea",
                target : chart_targets,
                colors : chart_colors[window.theme].area,
                line : false,
                opacity : 1
            }, {
                type : "stackline",
                target : chart_targets,
                colors : chart_colors[window.theme].line,
                opacity : 1
            }, {
                type : "stackline", // 사용하지 않음
                target : chart_targets,
                colors : function() {
                    return "transparent";
                },
                opacity : 0
            }, {
                type : "focus",
                start : -1,
                end : -1
            }, {
                type : "selectbox"
            }],
            widget : [{
                type : "title",
                text : window.message.msg1 + "(ms)",
                align : "start",
                dx : 10
            }, {
                type : "legend",
                brush : [ 0, 1, 2, 3, 4 ],
                brushSync : true,
                align : "end",
                dy : -5,
                format : function(key) {
                    return chart_names[key];
                }
            }, {
                type : "cross",
                xFormat : function(d) {
                    return time.format(d, "hh:mm");
                },
                yFormat : function(d) {
                    return Math.round(d).toLocaleForJennifer();
                }
            }]
        }));
    }
}

function updateDailyChart() {
    var sitemap = getSitemapInfo(),
        dates = getTodayDates(),
        params = {
            domain_id: combo_domain.getValue(),
            from_time: dates[0] / 1000,
            to_time: dates[1] / 1000,
            customer_id: "jennifer"
        };

    // 슬라이더 초기화
    range_slider.setFromValue(0);
    range_slider.setToValue(1000 * 60 * 60 * 24);

    if(sitemap == null) {
        chart_average.axis(0).update([]);
        chart_average.render();
        table_detail.reset();

        return;
    }

    console.log("구간별 응답시간 : " + JSON.stringify(params));
    console.log(new Date(params.from_time * 1000), new Date(params.to_time * 1000));

    $.get("/plugin/argos/daily", params, function(jsonStr) {
        if(jsonStr == "") return;

        var list = eval(jsonStr),
            items = [];

        for(var i = 0; i < list.length; i++) {
            var d = list[i];

            if(d.site_code == sitemap[0] && d.step_code == sitemap[1]) {
                d.date = new Date(d.measure_time);

                if(!d.resp_time) d.resp_time = 0;
                if(!d.dns_time) d.dns_time = 0;
                if(!d.socket_time) d.socket_time = 0;
                if(!d.request_time) d.request_time = 0;
                if(!d.first_byte_time) d.first_byte_time = 0;
                if(!d.download_time) d.download_time = 0;
                if(!d.resp_time) d.resp_time = 0;

                items.push(d);
            }
        }

        chart_average.updateBrush(0, { opacity: 0 });
        chart_average.updateBrush(1, { opacity: 0 });
        chart_average.updateBrush(2, { colors: chart_colors[window.theme].area });
        chart_average.updateBrush(3, { colors: chart_colors[window.theme].line });
        chart_average.updateBrush(5, { start: -1, end: -1 });
        chart_average.axis(0).set("x", { domain: getTodayDates() });
        chart_average.axis(0).update(items);
        chart_average.render();
    });
}

function updateMeasureTable(startFocus, endFocus) {
    var sitemap = getSitemapInfo(),
        params = {
            domain_id: combo_domain.getValue(),
            from_time: startFocus.getTime() / 1000,
            to_time: endFocus.getTime() / 1000,
            customer_id: "jennifer"
        };

    if(sitemap == null) return;

    console.log("시간별 테이블 : " + JSON.stringify(params));
    console.log(new Date(params.from_time * 1000), new Date(params.to_time * 1000));

    $.get("/plugin/argos/measure", params, function(jsonStr) {
        if(jsonStr == "") {
            table_detail.reset();
            return;
        }

        var list = eval(jsonStr),
            items = [];

        for(var i = 0; i < list.length; i++) {
            var d = list[i],
                s1 = (d.site_code == "null") ? null : d.site_code,
                s2 = (d.step_code == "null") ? null : d.step_code;

            if(s1 == sitemap[0] && d.s2 == sitemap[1]) {
                items.push(d);
            }
        }

        table_detail.stime = startFocus.getTime();
        table_detail.etime = endFocus.getTime();
        table_detail.update(items);

        setTimeout(function() {
            updateMeasureCharts(table_detail.list(), 0);
        }, 100);
    });

    setActiveDailyChartEffect(startFocus, endFocus);
}

function updateMeasureCharts(rows, index) {
    var data = rows[index].data,
        target = chart_targets.slice().reverse(),
        colors = chart_colors_2[window.theme].line.slice().reverse();

    jui.create("chart.builder", "#inner_graph_" + index, {
        padding: 0,
        height: 13,
        axis: {
            x : {
                type : "range",
                domain : function(d) {
                    return d.dns_time + d.socket_time + d.request_time + d.first_byte_time + d.download_time;
                },
                hide: true
            },
            y : {
                type : "block",
                domain : "",
                hide: true
            },
            data : [ data ]
        },
        brush : {
            type : "fullstackbar",
            target : target,
            colors : colors,
            outerPadding : 0
        },
        event : {
            "mouseover": function(obj, e) {
                var tooltip = chart_names[obj.dataKey] + " (" + obj.data[obj.dataKey].toLocaleForJennifer() + ")";

                $("#table_detail_tooltip").css({
                    left: (e.pageX - 135) + "px",
                    top: (e.pageY - 150) + "px"
                }).show();

                $("#table_detail_tooltip").find(".message").html(tooltip);
            },
            "mouseout": function() {
                $("#table_detail_tooltip").hide();
            }
        }
    });

    setTimeout(function() {
        if(index < rows.length - 1) {
            updateMeasureCharts(rows, index + 1);
        }
    }, 5);
}

function setActiveDailyChartEffect(startFocus, endFocus) {
    var newStartFocus = null,
        newEndFocus = null,
        data = chart_average.axis(0).data;

    if(data.length == 0) return;

    for(var i = 0; i < data.length; i++) {
        if(newStartFocus == null) {
            if (data[i].date.getTime() >= startFocus.getTime()) {
                newStartFocus = data[i].date;
            }
        }

        if(newEndFocus == null) {
            if (data[i].date.getTime() >= endFocus.getTime()) {
                newEndFocus = data[i].date;
            }
        }
    }

    chart_average.updateBrush(0, {
        opacity: 0.4
    });

    chart_average.updateBrush(1, {
        opacity: 0.4
    });

    chart_average.updateBrush(2, {
        colors : function(data) {
            if(data.date.getTime() >= startFocus.getTime() && data.date.getTime() < endFocus.getTime()) {
                return chart_colors[window.theme].area;
            }

            return "transparent";
        }
    });

    chart_average.updateBrush(3, {
        colors : function(data) {
            if(data.date.getTime() >= startFocus.getTime() && data.date.getTime() < endFocus.getTime()) {
                return chart_colors[window.theme].line;
            }

            return "transparent";
        }
    });

    chart_average.updateBrush(5, {
        start: newStartFocus || startFocus,
        end: newEndFocus || endFocus
    });

    chart_average.render();
}

function getSitemapInfo() {
    var sitemap = selectbox_site.getValue(),
        site_code = null,
        step_code = null;

    if(sitemap == null) return null;

    if(typeof(sitemap) == "string") {
        var tokens = sitemap.split(":");
        site_code = parseInt(tokens[0]);
        step_code = parseInt(tokens[1]);
    } else {
        site_code = sitemap;
    }

    return [ site_code, step_code ];
}

function getTodayDates() {
    var stime = layer_date.getTime();

    return [
        new Date(stime),
        new Date(stime + 1000 * 60 * 60 * 24)
    ];
}
function showServerData(index) {
    var data = table_detail.get(index).data;

    console.log(combo_domain.getValue(),
        data.tx_id_list,
        table_detail.stime,
        table_detail.etime);

    jennifer.ui.getXivewPointList(
        combo_domain.getValue(),
        data.tx_id_list,
        table_detail.stime,
        table_detail.etime
    );
}

function showFrontData(index) {
    var data = table_detail.get(index).data;

    window.open("http://argos-demo.vivans.net/web/analysis/ComponentAnalDetail:popup.argos?txid=" + data.tx_id_list[0], "argosDetailPopup", "scrollbars=yes,toolbar=yes,resizable=yes,width=1280,height=768");
}