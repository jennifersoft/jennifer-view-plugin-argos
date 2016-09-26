package com.jennifersoft.ctrl;

import com.jennifersoft.view.LogUtil;
import com.jennifersoft.view.service.DomainService;
import com.jennifersoft.view.service.perf.TextDataService;
import com.jennifersoft.view.service.perf.XViewService;
import com.jennifersoft.view.web.BaseController;
import org.apache.commons.io.IOUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.ServletContext;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.net.URL;
import java.util.*;

@Controller
@RequestMapping(value = { "/plugin" })
public class ArgosController extends BaseController
{
    private static final String ARGOS_API_URL = "http://argos-demo.vivans.net:8080/ArgosDataService/v2";

    @Autowired
    private ServletContext servletContext;
    @Autowired
    TextDataService textDataService;
    @Autowired
    XViewService xviewService;
    @Autowired
    DomainService domainService;

    @RequestMapping(value = { "/argos" }, method = RequestMethod.GET)
    public ModelAndView mainPage(WebRequest request) throws JSONException
    {
        ModelAndView modelAndView = new ModelAndView();
        ModelMap map = modelAndView.getModelMap();

        map.put("domains", domainService.connectedList());

        return modelAndView;
    }

    @RequestMapping(value = { "/argos/daily" })
    @ResponseBody
    private List<Map<String, Object>> getDailyDataList(@RequestParam short domain_id, @RequestParam long time) throws IOException, JSONException {
        URL u = new URL(ARGOS_API_URL + "?func_name=getDailyDataListForJennifer&domain_id=" + domain_id + "&query_time=" + time);
        JSONArray list = null;
        List<Map<String, Object>> result = null;

        try {
            list = (JSONArray) new JSONTokener(IOUtils.toString(u.openStream())).nextValue();
            result = createDailyAndHourlyData(list, -1);
        } catch(FileNotFoundException e) {
            LogUtil.info("No response results in Argos API (daily)");
            result = Collections.emptyList();
        }

        return result;
    }

    @RequestMapping(value = { "/argos/hourly" })
    @ResponseBody
    private List<Map<String, Object>> getHourlyDataList(@RequestParam short domain_id, @RequestParam long time, @RequestParam int site_code) throws IOException, JSONException {
        URL u = new URL(ARGOS_API_URL + "?func_name=getHourlyDataListForJennifer&domain_id=" + domain_id + "&query_time=" + time);
        JSONArray list = null;
        List<Map<String, Object>> result = null;

        try {
            list = (JSONArray) new JSONTokener(IOUtils.toString(u.openStream())).nextValue();
            result = createDailyAndHourlyData(list, site_code);
        } catch(FileNotFoundException e) {
            LogUtil.info("No response results in Argos API (hourly)");
            result = Collections.emptyList();
        }

        return result;
    }

    @RequestMapping(value = { "/argos/measure" })
    @ResponseBody
    private List<Map<String, Object>> getMeasureDataList(@RequestParam short domain_id, @RequestParam long stime, @RequestParam long etime, @RequestParam int site_code) throws IOException, JSONException {
        URL u = new URL(ARGOS_API_URL + "?func_name=getMeasureDataListForJennifer&domain_id=" + domain_id + "&from_time=" + stime + "&to_time=" + etime);
        JSONArray list = null;
        List<Map<String, Object>> result = null;

        try {
            list = (JSONArray) new JSONTokener(IOUtils.toString(u.openStream())).nextValue();
            result = createMeasureData(list, site_code);
        } catch(FileNotFoundException e) {
            LogUtil.info("No response results in Argos API (measure)");
            result = Collections.emptyList();
        }

        return result;
    }

    private List<Map<String, Object>> createDailyAndHourlyData(JSONArray list, int site_code) throws JSONException {
        List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();

        for(int i = 0; i < list.length(); i++) {
            JSONObject obj = (JSONObject) list.get(i);

            if(!obj.has("site_code")) continue;
            int target_code = obj.getInt("site_code");
            if(site_code != -1 && site_code != target_code) continue;

            Map<String, Object> data = new HashMap<String, Object>();
            setJSONFieldValue(data, obj, "site_code");
            setJSONFieldValue(data, obj, "site_name");
            setJSONFieldValue(data, obj, "measure_unix_time");
            setJSONFieldValue(data, obj, "measure_time");
            setJSONFieldValue(data, obj, "resp_time");
            setJSONFieldValue(data, obj, "dns_time");
            setJSONFieldValue(data, obj, "socket_time");
            setJSONFieldValue(data, obj, "request_time");
            setJSONFieldValue(data, obj, "first_byte_time");
            setJSONFieldValue(data, obj, "download_time");
            setJSONFieldValue(data, obj, "in_bytes");
            setJSONFieldValue(data, obj, "out_bytes");
            setJSONFieldValue(data, obj, "n_total_component");
            setJSONFieldValue(data, obj, "n_fail_component");
            setJSONFieldValue(data, obj, "service_url");
            setJSONFieldValue(data, obj, "available_rate");
            setJSONFieldValue(data, obj, "success_count");
            setJSONFieldValue(data, obj, "measure_count");

            result.add(data);
        }

        return result;
    }

    private List<Map<String, Object>> createMeasureData(JSONArray list, int site_code) throws JSONException {
        List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();

        for(int i = 0; i < list.length(); i++) {
            JSONObject obj = (JSONObject) list.get(i);

            if(!obj.has("site_code")) continue;
            int target_code = obj.getInt("site_code");
            if(site_code != -1 && site_code != target_code) continue;

            Map<String, Object> data = new HashMap<String, Object>();
            setJSONFieldValue(data, obj, "site_code");
            setJSONFieldValue(data, obj, "site_name");
            setJSONFieldValue(data, obj, "equip_code");
            setJSONFieldValue(data, obj, "equip_name");
            setJSONFieldValue(data, obj, "service_url");
            setJSONFieldValue(data, obj, "measure_unix_time");
            setJSONFieldValue(data, obj, "measure_time");
            setJSONFieldValue(data, obj, "resp_time");
            setJSONFieldValue(data, obj, "dns_time");
            setJSONFieldValue(data, obj, "socket_time");
            setJSONFieldValue(data, obj, "request_time");
            setJSONFieldValue(data, obj, "first_byte_time");
            setJSONFieldValue(data, obj, "download_time");
            setJSONFieldValue(data, obj, "in_bytes");
            setJSONFieldValue(data, obj, "out_bytes");
            setJSONFieldValue(data, obj, "n_total_component");
            setJSONFieldValue(data, obj, "n_fail_component");
            setJSONFieldValue(data, obj, "result_status");
            setJSONFieldValue(data, obj, "result_status_str");
            setJSONFieldValue(data, obj, "response_time_level");
            setJSONFieldValue(data, obj, "is_filter_error");
            setJSONFieldValue(data, obj, "main_seq");

            if(obj.has("tx_id_list")) {
                JSONArray txidArr = obj.getJSONArray("tx_id_list");
                List<String> txids = new ArrayList<String>();

                for(int j = 0; j < txidArr.length(); j++) {
                    txids.add(new String("" + txidArr.getLong(j)));
                }

                data.put("tx_id_list", txids);
            } else {
                data.put("tx_id_list", Collections.emptyList());
            }

            result.add(data);
        }

        return result;
    }

    private void setJSONFieldValue(Map<String, Object> data, JSONObject obj, String key) throws JSONException {
        data.put(key, obj.has(key) ? obj.get(key) : 0);
    }
}