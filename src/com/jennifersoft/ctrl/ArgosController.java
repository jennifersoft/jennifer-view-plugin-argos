package com.jennifersoft.ctrl;

import com.jennifersoft.view.LogUtil;
import com.jennifersoft.view.service.DomainService;
import com.jennifersoft.view.service.perf.TextDataService;
import com.jennifersoft.view.service.perf.XViewService;
import com.jennifersoft.view.web.BaseController;
import org.apache.commons.io.IOUtils;
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

@Controller
@RequestMapping(value = { "/plugin" })
public class ArgosController extends BaseController
{
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
        return getArgosContents(u);
    }

    @RequestMapping(value = { "/argos/daily" })
    @ResponseBody
    private String getArgosDailyData(@RequestParam short domain_id, @RequestParam long from_time, @RequestParam long to_time,
                                 @RequestParam(required = false, defaultValue="jennifer") String customer_id) throws MalformedURLException {
        URL u = new URL(ARGOS_API_URL + "?func_name=getMeasureDataSummaryListForJennifer&domain_id=" + domain_id + "&customer_id=" + customer_id + "&from_time=" + from_time + "&to_time=" + to_time);
        return getArgosContents(u);
    }

    @RequestMapping(value = { "/argos/measure" })
    @ResponseBody
    private String getArgosMeasureData(@RequestParam short domain_id, @RequestParam long from_time, @RequestParam long to_time,
                                     @RequestParam(required = false, defaultValue="jennifer") String customer_id) throws MalformedURLException {
        URL u = new URL(ARGOS_API_URL + "?func_name=getMeasureDataListForJennifer&domain_id=" + domain_id + "&customer_id=" + customer_id + "&from_time=" + from_time + "&to_time=" + to_time);
        return getArgosContents(u);
    }

    private String getArgosContents(URL u) {
        String result = "";

        try {
            JSONObject json = new JSONObject(IOUtils.toString(u.openStream()));
            String status = json.getString("resultStatus");

            if(status.equals("200")) {
                return json.getString("resultContent");
            }
        } catch (JSONException e) {
            LogUtil.error(e);
        } catch (IOException e) {
            LogUtil.error(e);
        }

        return result;
    }
}