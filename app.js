(function () {
      var SUN_F = 15;
      var TEXTCOL = { normal: "#15803d", caution: "#b38600", extreme: "#ea580c", danger: "#dc2626", critical: "#7f1d1d" };
      function bandSpan(b) { var e = document.createElement("strong"); e.className = "bt"; e.textContent = b.name; e.style.color = TEXTCOL[b.id]; return e; }
      var BANDS = [
        { id: "normal", name: "Normal / Safe", range: "Below 27.0°C", effect: "Unlikely thermal stress under normal activity.", color: "#16a34a" },
        { id: "caution", name: "Caution", range: "27.0°C to 32.9°C", effect: "Fatigue is possible with prolonged exposure and activity. Continuing activity could lead to heat cramps.", color: "#eab308" },
        { id: "extreme", name: "Extreme Caution", range: "33.0°C to 41.9°C", effect: "Heat cramps and heat exhaustion are possible. Continuing activity could lead to heat stroke.", color: "#f97316" },
        { id: "danger", name: "Danger", range: "42.0°C to 51.9°C", effect: "Heat cramps and heat exhaustion are likely; heat stroke is probable with continued activity.", color: "#ef4444" },
        { id: "critical", name: "Extreme Danger", range: "52.0°C and above", effect: "Heat stroke is imminent.", color: "#991b1b" }
      ];
      var CONTROLS = [
        { tier: "Caution", band: "caution", text: "Ensure adequate natural or mechanical ventilation (DOLE OSHS Rule 1076)." },
        { tier: "Caution", band: "caution", text: "Provide free, accessible drinking water; encourage intake of at least 2 to 3 liters per day." },
        { tier: "Caution", band: "caution", text: "Conduct information dissemination on heat stress symptoms." },
        { tier: "Extreme Caution", band: "extreme", text: "Adjust rest breaks and rotate personnel to shaded or air-conditioned recovery areas." },
        { tier: "Extreme Caution", band: "extreme", text: "Issue temperature-appropriate uniforms and UV-protective PPE: wide-brimmed hats, UV goggles, and breathable cotton or light-colored long sleeves." },
        { tier: "Extreme Caution", band: "extreme", text: "Actively monitor workers with comorbidities (hypertension, cardiovascular conditions, kidney disease)." },
        { tier: "Danger", band: "danger", text: "Enforce strict work-rest schedules and allow self-paced work." },
        { tier: "Danger", band: "danger", text: "Reschedule high-metabolic or non-essential outdoor tasks to cooler hours (early morning or late afternoon)." },
        { tier: "Danger", band: "danger", text: "Enforce a mandatory buddy system and ready first-aid and hydration stations." },
        { tier: "Extreme Danger", band: "critical", text: "Immediately suspend non-critical outdoor or uncooled high-heat operations." },
        { tier: "Extreme Danger", band: "critical", text: "Activate emergency heat-stroke response, rapid cooling protocols, and medical evacuation readiness." }
      ];
      var RANK = { normal: 0, caution: 1, extreme: 2, danger: 3, critical: 4 };

      var state = { unit: "C", tempText: "32.0", rhText: "70", sun: false };
      var tempEl = document.getElementById("temp");
      var rhEl = document.getElementById("rh");
      var slider = document.getElementById("rh-slider");
      var liveTimer = 0;

      function round1(n) { return Math.round(n * 10) / 10; }
      function fmt(n) { return round1(n).toFixed(1); }
      function cToF(c) { return (c * 9) / 5 + 32; }
      function fToC(f) { return ((f - 32) * 5) / 9; }
      function parseNum(raw) {
        if (typeof raw !== "string") return NaN;
        var s = raw.trim().replace(",", ".");
        if (!s || s === "-" || s === "." || s === "-.") return NaN;
        return Number(s);
      }
      function heatIndexF(tempF, rh) {
        var simple = 0.5 * (tempF + 61.0 + (tempF - 68.0) * 1.2 + rh * 0.094);
        if (simple < 80) return { hiF: simple, method: "Steadman approximation (first estimate under 80°F)" };
        var T = tempF, R = rh;
        var hi = -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R - 0.00683783 * T * T - 0.05481717 * R * R + 0.00122874 * T * T * R + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R;
        if (R < 13 && T >= 80 && T <= 112) {
          hi -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
          return { hiF: hi, method: "Rothfusz regression, low-humidity adjustment" };
        }
        if (R > 85 && T >= 80 && T <= 87) {
          hi += ((R - 85) / 10) * ((87 - T) / 5);
          return { hiF: hi, method: "Rothfusz regression, high-humidity adjustment" };
        }
        return { hiF: hi, method: "Rothfusz regression" };
      }
      function bandForC(hiC) {
        var c = round1(hiC);
        if (c >= 52) return BANDS[4];
        if (c >= 42) return BANDS[3];
        if (c >= 33) return BANDS[2];
        if (c >= 27) return BANDS[1];
        return BANDS[0];
      }
      function scalePct(c) {
        var stops = [[24, 0], [27, 8.333], [33, 25], [42, 50], [52, 77.778], [60, 100]];
        var x = Math.min(60, Math.max(24, c));
        for (var i = 1; i < stops.length; i++) {
          if (x <= stops[i][0]) {
            var u = (x - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
            return stops[i - 1][1] + u * (stops[i][1] - stops[i - 1][1]);
          }
        }
        return 100;
      }
      function readTemp() {
        var n = parseNum(state.tempText);
        if (!isFinite(n)) return null;
        var c = state.unit === "C" ? n : fToC(n);
        return { c: c, out: c < 10 || c > 50 };
      }
      function readRh() {
        var n = parseNum(state.rhText);
        if (!isFinite(n)) return null;
        if (n < 0 || n > 100) return { rh: Math.min(100, Math.max(0, n)), out: true };
        return { rh: Math.round(n), out: false };
      }

      function paint() {
        var temp = readTemp();
        var rh = readRh();
        var hint = document.getElementById("temp-hint");
        slider.style.setProperty("--fill", (rh && !rh.out ? rh.rh : 0) + "%");
        document.getElementById("rh-read").textContent = (rh && !rh.out ? rh.rh : "–") + "%";
        if (rh && !rh.out) slider.value = String(rh.rh);
        slider.setAttribute("aria-valuenow", slider.value);
        slider.setAttribute("aria-valuetext", slider.value + " percent");

        var figure = document.getElementById("hi-figure");
        var warn = document.getElementById("warn");
        var list = document.getElementById("action-list");
        var action = document.getElementById("action");
        if (!temp || !rh || temp.out || rh.out) {
          figure.replaceChildren(document.createTextNode("–"), Object.assign(document.createElement("small"), { textContent: "" }));
          document.getElementById("hi-f").textContent = "";
          document.getElementById("band-name").textContent = "Waiting for a valid reading";
          document.getElementById("swatch").style.background = "#d6d3d1";
          document.getElementById("effect").textContent = "";
          document.getElementById("shade-val").textContent = "–";
          document.getElementById("sun-val").textContent = "–";
          document.getElementById("card-shade").className = "";
          document.getElementById("card-sun").className = "";
          document.getElementById("basis").textContent = "";
          document.getElementById("legend").replaceChildren();
          document.getElementById("method").textContent = "";
          document.getElementById("delta").hidden = true;
          warn.hidden = false;
          warn.textContent = "Enter air temperature from 10.0°C to 50.0°C (50.0°F to 122.0°F) and relative humidity from 0 to 100.";
          hint.textContent = state.unit === "C" ? "Accepted range: 10.0°C to 50.0°C." : "Accepted range: 50.0°F to 122.0°F.";
          action.style.setProperty("--band", "#d6d3d1");
          document.getElementById("action-basis").textContent = "";
          document.getElementById("action-lead").textContent = "The action card updates when both inputs are inside range.";
          list.replaceChildren();
          return;
        }

        var airF = cToF(temp.c);
        var met = heatIndexF(airF, rh.rh);
        var shadeC = fToC(met.hiF);
        var sunC = fToC(met.hiF + SUN_F);
        var shadeBand = bandForC(shadeC);
        var sunBand = bandForC(sunC);
        var activeC = state.sun ? sunC : shadeC;
        var activeF = state.sun ? met.hiF + SUN_F : met.hiF;
        var band = state.sun ? sunBand : shadeBand;
        var other = state.sun ? shadeBand : sunBand;

        var small = document.createElement("small"); small.textContent = "°C";
        figure.replaceChildren(document.createTextNode(fmt(activeC)), small);
        document.getElementById("hi-f").textContent = fmt(activeF) + "°F";
        document.getElementById("basis").textContent = state.sun
          ? "Classification basis · direct sunlight"
          : "Classification basis · shaded / indoor";
        document.getElementById("band-name").textContent = band.name; document.getElementById("band-name").style.color = TEXTCOL[band.id];
        document.getElementById("swatch").style.background = band.color;
        document.getElementById("effect").textContent = band.effect;
        document.getElementById("shade-val").textContent = fmt(shadeC) + "°C · " + fmt(met.hiF) + "°F";
        document.getElementById("sun-val").textContent = fmt(sunC) + "°C · " + fmt(met.hiF + SUN_F) + "°F";
        document.getElementById("card-shade").className = state.sun ? "" : "on";
        document.getElementById("card-sun").className = state.sun ? "on" : "";
        document.getElementById("tick-on").style.left = scalePct(round1(activeC)) + "%";
        document.getElementById("tick-off").style.left = scalePct(round1(state.sun ? shadeC : sunC)) + "%";

        var delta = document.getElementById("delta");
        if (shadeBand.id !== sunBand.id) {
          delta.hidden = false;
          delta.replaceChildren("Shade is ", bandSpan(shadeBand), ". Direct sun is ", bandSpan(sunBand), ". The action card follows " + (state.sun ? "direct sunlight" : "shaded / indoor") + ".");
        } else {
          delta.hidden = true;
        }

        var legend = document.getElementById("legend");
        legend.replaceChildren();
        BANDS.forEach(function (b) {
          var li = document.createElement("li");
          if (b.id === band.id) li.className = "on";
          var sw = document.createElement("i");
          sw.style.background = b.color;
          var name = document.createElement("b");
          name.textContent = b.name; name.style.color = TEXTCOL[b.id];
          var range = document.createElement("span");
          range.textContent = b.range;
          li.append(sw, name, range);
          legend.append(li);
        });

        var beyond = airF > 112 || met.hiF > 160;
        document.getElementById("method").textContent = met.method + ". PAGASA band uses the selected exposure, rounded to 0.1°C. Air " + fmt(temp.c) + "°C (" + fmt(airF) + "°F), RH " + rh.rh + "%.";
        warn.hidden = !beyond;
        warn.textContent = beyond ? "This sits outside the fitted window of the NWS regression (very hot air, or a result well above the printed chart). Use the band as a stop-work signal, not as a precise degree." : "";

        hint.textContent = state.unit === "C"
          ? "Equals " + fmt(airF) + "°F. Range 10.0°C to 50.0°C."
          : "Equals " + fmt(temp.c) + "°C. Range 50.0°F to 122.0°F.";

        action.style.setProperty("--band", band.color);
        document.getElementById("action-basis").textContent = "DOLE Labor Advisory No. 08-23 · band follows the " + (state.sun ? "solar-adjusted" : "meteorological") + " heat index";
        var lead = document.getElementById("action-lead");
        list.replaceChildren();
        if (band.id === "normal") {
          lead.textContent = "This reading is below the PAGASA caution threshold, so the heat-stress tiers in this card are not triggered. Ordinary ventilation and drinking water remain good practice under OSHS Rule 1076. They are not, by themselves, an LA 08-23 emergency action.";
        } else {
          lead.replaceChildren("Employer controls in force at ", bandSpan(band), ". Everything from the lower bands stays in force. Added items are marked with their tier.");
          CONTROLS.forEach(function (item) {
            if (RANK[item.band] > RANK[band.id]) return;
            var li = document.createElement("li");
            var tag = document.createElement("span");
            tag.className = "tier";
            tag.textContent = item.tier; tag.style.color = TEXTCOL[item.band]; tag.style.fontWeight = "700";
            var text = document.createElement("span");
            text.textContent = item.text; text.style.color = TEXTCOL[item.band]; text.style.fontWeight = "500";
            li.append(tag, text);
            list.append(li);
          });
        }

        window.clearTimeout(liveTimer);
        liveTimer = window.setTimeout(function () {
          var basis = state.sun ? "solar-adjusted" : "shaded";
          document.getElementById("live").textContent =
            basis + " heat index " + fmt(activeC) + " degrees Celsius, " + fmt(activeF) + " degrees Fahrenheit, " + band.name +
            ". Shade " + fmt(shadeC) + ". Direct sun " + fmt(sunC) + ".";
        }, 280);
      }

      tempEl.addEventListener("input", function () {
        state.tempText = tempEl.value;
        paint();
      });
      rhEl.addEventListener("input", function () {
        state.rhText = rhEl.value;
        paint();
      });
      slider.addEventListener("input", function () {
        state.rhText = slider.value;
        rhEl.value = slider.value;
        paint();
      });
      tempEl.addEventListener("blur", function () {
        var t = readTemp();
        if (t && !t.out) {
          var shown = state.unit === "C" ? t.c : cToF(t.c);
          state.tempText = fmt(shown);
          tempEl.value = state.tempText;
          paint();
        }
      });
      rhEl.addEventListener("blur", function () {
        var r = readRh();
        if (r && !r.out) {
          state.rhText = String(r.rh);
          rhEl.value = state.rhText;
          paint();
        }
      });

      function setUnit(unit) {
        if (state.unit === unit) return;
        var t = readTemp();
        state.unit = unit;
        document.getElementById("unit-c").setAttribute("aria-pressed", unit === "C" ? "true" : "false");
        document.getElementById("unit-f").setAttribute("aria-pressed", unit === "F" ? "true" : "false");
        if (t && isFinite(t.c)) {
          state.tempText = fmt(unit === "C" ? t.c : cToF(t.c));
          tempEl.value = state.tempText;
        }
        paint();
      }
      document.getElementById("unit-c").addEventListener("click", function () { setUnit("C"); });
      document.getElementById("unit-f").addEventListener("click", function () { setUnit("F"); });

      function setSun(sun) {
        state.sun = sun;
        document.getElementById("expo-shade").setAttribute("aria-pressed", sun ? "false" : "true");
        document.getElementById("expo-sun").setAttribute("aria-pressed", sun ? "true" : "false");
        paint();
      }
      document.getElementById("expo-shade").addEventListener("click", function () { setSun(false); });
      document.getElementById("expo-sun").addEventListener("click", function () { setSun(true); });

      paint();

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(function () {});
      }
    })();
