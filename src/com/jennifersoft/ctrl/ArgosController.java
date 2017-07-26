package com.jennifersoft.ctrl;

import com.aries.view.LogUtil;
import com.aries.view.service.DomainService;
import com.aries.view.service.perf.TextDataService;
import com.aries.view.service.perf.XViewService;
import com.aries.view.web.BaseController;
import org.apache.commons.io.IOUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.ModelAndView;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;

@Controller
@RequestMapping(value = { "/plugin" })
public class ArgosController {
    private static final String ARGOS_API_URL = "http://argos-demo.vivans.net:8080/ArgosDataService";

    @Autowired
    TextDataService textDataService;
    @Autowired
    XViewService xviewService;
    @Autowired
    DomainService domainService;

    @RequestMapping(value = { "/argos" }, method = RequestMethod.GET)
    public ModelAndView getArgosMainPage(WebRequest request) throws JSONException
    {
        ModelAndView modelAndView = new ModelAndView();
        ModelMap map = modelAndView.getModelMap();
        map.put("domains", domainService.connectedList());

        return modelAndView;
    }

    @RequestMapping(value = { "/argos/sites" })
    @ResponseBody
    private String getArgosSites(@RequestParam short domain_id,
                                                       @RequestParam(required = false, defaultValue="jennifer") String customer_id) throws MalformedURLException {
        URL u = new URL(ARGOS_API_URL + "?func_name=getSiteListForJennifer&domain_id=" + domain_id + "&customer_id=" + customer_id);
        return getArgosContents(u, false);
    }

    @RequestMapping(value = { "/argos/daily" })
    @ResponseBody
    private String getArgosDailyData(@RequestParam short domain_id, @RequestParam long from_time, @RequestParam long to_time,
                                 @RequestParam(required = false, defaultValue="jennifer") String customer_id) throws MalformedURLException {
        URL u = new URL(ARGOS_API_URL + "?func_name=getMeasureDataSummaryListForJennifer&domain_id=" + domain_id + "&customer_id=" + customer_id + "&from_time=" + from_time + "&to_time=" + to_time);
        return getArgosContents(u, false);
    }

    @RequestMapping(value = { "/argos/measure" })
    @ResponseBody
    private String getArgosMeasureData(@RequestParam short domain_id, @RequestParam long from_time, @RequestParam long to_time,
                                     @RequestParam(required = false, defaultValue="jennifer") String customer_id) throws MalformedURLException {
        URL u = new URL(ARGOS_API_URL + "?func_name=getMeasureDataListForJennifer&domain_id=" + domain_id + "&customer_id=" + customer_id + "&from_time=" + from_time + "&to_time=" + to_time);
        return getArgosContents(u, true);
    }

    private String getArgosContents(URL u, boolean isMesaure) {
        String result = "";

        try {
            JSONObject json = new JSONObject(IOUtils.toString(u.openStream()));
            String status = json.getString("resultStatus");

            if(status.equals("200")) {
                if(isMesaure) {
                    JSONArray jsonArray = new JSONArray(json.getString("resultContent"));

                    for(int i = 0; i < jsonArray.length(); i++) {
                        setJSONRowData(jsonArray.getJSONObject(i));
                    }

                    return jsonArray.toString();
                } else {
                    return json.getString("resultContent");
                }
            }
        } catch (JSONException e) {
            LogUtil.error(e);
        } catch (IOException e) {
            LogUtil.error(e);
        }

        return result;
    }

    private void setJSONRowData(JSONObject data) throws JSONException {
        Iterator<String> keys = data.keys();

        while(keys.hasNext()) {
            String key = keys.next();

            if(data.isNull(key)) {
                if( key.equals("resp_time") ||
                        key.equals("dns_time") ||
                        key.equals("socket_time") ||
                        key.equals("request_time") ||
                        key.equals("first_byte_time") ||
                        key.equals("download_time") ||
                        key.equals("in_bytes") ||
                        key.equals("n_total_component") ||
                        key.equals("n_fail_component")
                ) {
                    data.put(key, 0);
                }

                if(key.equals("tx_id_list")) {
                    data.put(key, Collections.EMPTY_LIST);
                }
            } else {
                if(key.equals("tx_id_list")) {
                    JSONArray txidArr = data.getJSONArray(key);
                    List<String> txids = new ArrayList<String>();

                    for(int j = 0; j < txidArr.length(); j++) {
                        txids.add(new String("" + txidArr.getLong(j)));
                    }

                    data.put(key, txids);
                }
            }
        }
    }
}