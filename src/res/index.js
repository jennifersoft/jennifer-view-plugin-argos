var combo_domain, layer_date, chart_average, table_detail, selectbox_site;
var site_info = {}, active_hour = new Date().getHours();

var chart_names = {
    resp_time: "Response",
    dns_time: "DNS",
    socket_time: "Socket",
    request_time: "Request",
    first_byte_time: "First Byte",
    download_time: "Download"
};

var chart_targets = [ "dns_time", "socket_time", "request_time", "first_byte_time", "download_time" ];

var chart_colors = {
    jennifer: {
        area: [ "#cbcfd7", "#dfebfb", "#d7f2eb", "#e8ddf0", "#fad1cb", "#ffebbb" ],
        line: [ "#666c9b", "#5d9ced", "#37bc9b", "#c6a9d9", "#f5a397", "#ffce54" ],
        grid: "#dcdcdc"
    },
    dark: {
        area: [ "#23344e", "#3c5b84", "#265b4e", "#70627a", "#8a7673", "#766232" ],
        line: [ "#666c8b", "#5d9ced", "#37bc9b", "#c6a9d9", "#f5a397", "#ffce54" ],
        grid: "#464646"
    }
};

jui.ready([ "ui.combo", "ui.datepicker", "chart.builder", "grid.xtable", "selectbox" ],
    function(combo, datepicker, builder, xtable, selectbox) {

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
        height: 250,
        search: true,
        event: {
            select: function(data, e) {
                updateDailyChart();
            }
        }
    });

    chart_average = builder("#chart_average", {
        theme : window.theme,
        height : 250,
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
                domain : function(d) {
                    return getChartTarget(d.dns_time + d.socket_time + d.request_time + d.first_byte_time + d.download_time);
                },
                step : 4
            },
            padding : 50
        }],
        brush : [{
            type : "stackarea",
            target : chart_targets,
            colors : chart_colors[window.theme].area,
            line : false,
            opacity : 0
        }, {
            type : "stackline",
            target : chart_targets,
            colors : chart_colors[window.theme].line,
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
            type : "stackline",
            target : chart_targets,
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
            type : "legend",
            filter : true,
            brush : [ 0, 1, 2, 3, 4 ],
            brushSync : true,
            align : "end",
            format : function(key) {
                return chart_names[key];
            }
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
            axisBorderColor : chart_colors[window.theme].grid,
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
            tooltipPointBorderWidth : 0
        },
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

function updateDailyChart() {
    var sitemap = getSitemapInfo(),
        dates = getTodayDates(),
        params = {
            domain_id: combo_domain.getValue(),
            from_time: dates[0] / 1000,
            to_time: dates[1] / 1000,
            customer_id: "jennifer"
        };

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
            var d = list[i];

            if(d.site_code == sitemap[0] && d.step_code == sitemap[1]) {
                if(!d.tx_id_list) d.tx_id_list = [];
                if(!d.resp_time) d.resp_time = 0;
                if(!d.dns_time) d.dns_time = 0;
                if(!d.socket_time) d.socket_time = 0;
                if(!d.request_time) d.request_time = 0;
                if(!d.first_byte_time) d.first_byte_time = 0;
                if(!d.download_time) d.download_time = 0;
                if(!d.in_bytes) d.in_bytes = 0;
                if(!d.n_total_component) d.n_total_component = 0;
                if(!d.n_fail_component) d.n_fail_component = 0;

                items.push(d);
            }
        }

        table_detail.update(items);
    });

    setActiveDailyChartEffect(startFocus, endFocus);
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
    var data = table_detail.get(index).data,
        stime = layer_date.getTime();

    jennifer.ui.getXivewPointList(
        combo_domain.getValue(),
        data.tx_id_list,
        stime,
        stime + (1000 * 60 * 60)
    );
}

function showFrontData(index) {
    var data = table_detail.get(index).data;

    window.open("http://argos-demo.vivans.net/web/analysis/ComponentAnalDetail:popup.argos?txid=" + data.tx_id_list[0], "argosDetailPopup", "scrollbars=yes,toolbar=yes,resizable=yes,width=1280,height=768");
}