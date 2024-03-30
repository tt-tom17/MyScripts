/*
 * @author 2023 @tt-tom
 *
 * Dieses Skript dient zur freien Verwendung in ioBroker.
 * Jegliche Verantwortung liegt beim Benutzer. 
 * 
 * Version 1.2.0
 *
 * Setzt NSPanel Script Version 4.3.1.5 oder größer voraus
 * 
 *  12.10.23 - v1.1.0 - Breaking Change - Datenpunkte an das Panel Script angepasst -> vor dem Start des Scripts alten Ordner "Fahrplananzeiger" aus 0_userdata und Alias.0 löschen
 *  13.10.23 - v1.1.1 - Fix additional info
 *  20.12.23 - v1.1.2 - Add mapping line.mode => Iconname
 *  23.12.23 - v1.1.3 - Add Button Info only for additional info
 *  14.02.24 - v1.2.0 - Add importing routes
 * 
 * 
 * auslesen der Daten aus dem Adapter Fahrplan und zusammenstellen für das Sonoff NSPanel
 * Die Farben für die Notifypage können unter https://nodtem66.github.io/nextion-hmi-color-convert/index.html
*/

const Debug = false;
const json_Log = false;
/**
 * Allgemeine Einstellungen
 */
const dp_NSPanel: string = '0_userdata.0.NSPanel.1.';        // Standard 0_userdata.0.NSPanel.1.
const dp_Userdata: string = '0_userdata.0.NSPanel.allgemein.';        // Pafad unter 0_userdata.0  Automatisch wird "FahrplanAnzeiger.HaltestelleX.AbfahrtX" durch das Script erzeugt
const dp_Alias: string = 'alias.0.NSPanel.allgemein.';         // Pfad unter alias.0       Automatisch wird "FahrplanAnzeiger.HaltestelleX.AbfahrtX" durch das Script erzeugt

/**
 * Einstellungen für Halltestellen / Anzeigetafeln
 */
const anzahlHaltestellen: number = 1;               // Anzahl der Haltestellen / Anzeigetafeln
const anzahlAbfahrtenHaltestelle: number = 4;                     // Abfahrten an der Haltestelle -> mehr als 4 kann das NSPanel noch nicht anzeigen
const verspaetungPopupHaltestelle: boolean = true;             // Bei Verspätung soll PopupNotifypage auf dem Panel angezeigt werden
const verspaetungszeitHaltestelle: number = 300;               // Verspätungszeit in sek
let info: string = '';

/**
 * Einstellungen für Routen
 */
const anzahlRouten: number = 2;               // Anzahl der Haltestellen / Anzeigetafeln
const anzahlAbfahrtenRoute: number = 4;                     // Abfahrten an der Haltestelle -> mehr als 4 kann das NSPanel noch nicht anzeigen
const verspaetungPopupRoute: boolean = true;             // Bei Verspätung soll PopupNotifypage auf dem Panel angezeigt werden
const verspaetungszeitRoute: number = 300;               // Verspätungszeit in sek

// Map für icon => [line.mode vom Fahrplan, Iconname aus der Icon-Datei (NSPanel)]
const fahrzeugMap = new Map([
    ['bus', 'bus'],
    ['train', 'train']
]);

// ------------------------- Ab hier keine Änderungen mehr nötig ----------------------------

/**
 * erstellen der Datenpunkte in 0_userdata.0 und alias.0 je Haltestelle und je Route
 */
async function init_Datenpunkte() {
    try {
        for (let h = 0; h < anzahlHaltestellen; h++) {
            for (let i = 0; i < anzahlAbfahrtenHaltestelle; i++) {
                if (existsObject(dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i)) == false) {
                    log(`Datenpunkte für Haltestelle ${h} Abfahrt ${i} werden angelegt`)
                    await createStateAsync(dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Departure', '00:00', { type: 'string', name: { de: 'Abfahrzeit', en: 'Departure time' } });
                    await createStateAsync(dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Direction', 'Hbf', { type: 'string', name: { de: 'Richtung', en: 'Direction' } });
                    await createStateAsync(dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Vehicle', 'train', { type: 'string', name: { de: 'Fahrzeug', en: 'Vehicle' } });
                    await createStateAsync(dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Delay', false, { type: 'boolean', name: { de: 'Verspätung', en: 'Delay' } });
                    setObject(dp_Alias + 'FahrplanAnzeiger.Haltestelle' + String(h), { type: 'device', common: { role: 'timeTable', name: { de: 'Haltestelle ' + String(h), en: 'Station ' + String(h) } }, native: {} });
                    setObject(dp_Alias + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i), { type: 'channel', common: { role: 'timeTable', name: { de: 'Abfahrt ' + String(i), en: 'Departure ' + String(i) } }, native: {} });
                    await createAliasAsync(dp_Alias + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.ACTUAL', dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Departure', true, <iobJS.StateCommon>{ type: 'string', role: 'state', name: { de: 'Abfahrzeit', en: 'Departure time' } });
                    await createAliasAsync(dp_Alias + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.DIRECTION', dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Direction', true, <iobJS.StateCommon>{ type: 'string', role: 'state', name: { de: 'Richtung', en: 'Direction' } });
                    await createAliasAsync(dp_Alias + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.VEHICLE', dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Vehicle', true, <iobJS.StateCommon>{ type: 'string', role: 'state', name: { de: 'Fahrzeug', en: 'Vehicle' } });
                    await createAliasAsync(dp_Alias + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.DELAY', dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Delay', true, <iobJS.StateCommon>{ type: 'boolean', role: 'state', name: { de: 'Verspätung', en: 'Delay' } });
                    log(`Fertig`)
                } else {
                    log(`Datenpunkte für Haltestelle ${h} Abfahrt ${i} vorhanden`)
                }
            }
        }
        for (let h = 0; h < anzahlRouten; h++) {
            for (let i = 0; i < anzahlAbfahrtenRoute; i++) {
                if (existsObject(dp_Userdata + 'FahrplanAnzeiger.Route' + String(h) + '.Abfahrt' + String(i)) == false) {
                    log(`Datenpunkte für Route ${h} Abfahrt ${i} werden angelegt`)
                    await createStateAsync(dp_Userdata + 'FahrplanAnzeiger.Route' + String(h) + '.Abfahrt' + String(i) + '.Departure', '00:00', { type: 'string', name: { de: 'Abfahrzeit', en: 'Departure time' } });
                    await createStateAsync(dp_Userdata + 'FahrplanAnzeiger.Route' + String(h) + '.Abfahrt' + String(i) + '.Direction', 'Hbf', { type: 'string', name: { de: 'Richtung', en: 'Direction' } });
                    await createStateAsync(dp_Userdata + 'FahrplanAnzeiger.Route' + String(h) + '.Abfahrt' + String(i) + '.Vehicle', 'train', { type: 'string', name: { de: 'Fahrzeug', en: 'Vehicle' } });
                    await createStateAsync(dp_Userdata + 'FahrplanAnzeiger.Route' + String(h) + '.Abfahrt' + String(i) + '.Delay', false, { type: 'boolean', name: { de: 'Verspätung', en: 'Delay' } });
                    setObject(dp_Alias + 'FahrplanAnzeiger.Route' + String(h), { type: 'device', common: { role: 'timeTable', name: { de: 'Route ' + String(h), en: 'Route ' + String(h) } }, native: {} });
                    setObject(dp_Alias + 'FahrplanAnzeiger.Route' + String(h) + '.Abfahrt' + String(i), { type: 'channel', common: { role: 'timeTable', name: { de: 'Abfahrt ' + String(i), en: 'Departure ' + String(i) } }, native: {} });
                    await createAliasAsync(dp_Alias + 'FahrplanAnzeiger.Route' + String(h) + '.Abfahrt' + String(i) + '.ACTUAL', dp_Userdata + 'FahrplanAnzeiger.Route' + String(h) + '.Abfahrt' + String(i) + '.Departure', true, <iobJS.StateCommon>{ type: 'string', role: 'state', name: { de: 'Abfahrzeit', en: 'Departure time' } });
                    await createAliasAsync(dp_Alias + 'FahrplanAnzeiger.Route' + String(h) + '.Abfahrt' + String(i) + '.DIRECTION', dp_Userdata + 'FahrplanAnzeiger.Route' + String(h) + '.Abfahrt' + String(i) + '.Direction', true, <iobJS.StateCommon>{ type: 'string', role: 'state', name: { de: 'Richtung', en: 'Direction' } });
                    await createAliasAsync(dp_Alias + 'FahrplanAnzeiger.Route' + String(h) + '.Abfahrt' + String(i) + '.VEHICLE', dp_Userdata + 'FahrplanAnzeiger.Route' + String(h) + '.Abfahrt' + String(i) + '.Vehicle', true, <iobJS.StateCommon>{ type: 'string', role: 'state', name: { de: 'Fahrzeug', en: 'Vehicle' } });
                    await createAliasAsync(dp_Alias + 'FahrplanAnzeiger.Route' + String(h) + '.Abfahrt' + String(i) + '.DELAY', dp_Userdata + 'FahrplanAnzeiger.Route' + String(h) + '.Abfahrt' + String(i) + '.Delay', true, <iobJS.StateCommon>{ type: 'boolean', role: 'state', name: { de: 'Verspätung', en: 'Delay' } });
                    log(`Fertig`)
                } else {
                    log(`Datenpunkte für Route ${h} Abfahrt ${i} vorhanden`)
                }
            }
        }
    } catch (err) {
        log(`error at function Init_Datenpunkte: ${err.message}`, `warn`);
    }
}
init_Datenpunkte();

/**
 * Auslesen der JSON Daten der Haltestelle und den einzelnen Abfahrten zu ordnen
 *  
 * @param json_Haltestelle Json-String mit Daten der Haltetsellen 
 * @param haltestelle Nummer der Haltestelle
 * @returns 
 */
async function json_HaltestelleUmwandeln(json_Haltestelle: string, haltestelle: string) {
    try {

        let aktuelleAbfahrzeit: string = '';
        let geplanteAbfahrzeit: string = '';
        let richtung: string = '';
        let fahrzeugTyp: string = '';
        let fahrzeugNummer: string = '';
        let timeDelay: number = 0;
        let minuten: number = 0;

        let h = haltestelle

        if (parseInt(h) > anzahlHaltestellen) {
            log(`Es werden Daten nur von ${anzahlHaltestellen} Haltestelle/n ausgewertet. Der Fahrplan-Adapter liefert aber mehr Daten. Ggf die Anzahl der Haltestellen im Script erhöhen.`);
            return;
        } else {
            if (json_Log) log(getState(json_Haltestelle).val);

            reset_DataHaltestelle(h)

            let haltestellenPlan: any = JSON.parse(getState(json_Haltestelle).val);

            if (Debug) log(`Anzahl der Abfahrten Haltestelle ${h}: ${haltestellenPlan.length}`);

            for (let i = 0; i < haltestellenPlan.length; i++) {

                if (i == anzahlAbfahrtenHaltestelle) {
                    log(`Es werden nur die ersten ${anzahlAbfahrtenHaltestelle} Abfahrten pro Route eingelesen`, `warn`);
                    break;
                };

                if (Debug) log(`Beginn Auswertung Haltestelle ${h} Abfahrt: ${i}`);

                let abfahrtHaltestelle = haltestellenPlan[i];

                if (json_Log) log(JSON.stringify(abfahrtHaltestelle));

                aktuelleAbfahrzeit = getAttr(abfahrtHaltestelle, 'when');
                geplanteAbfahrzeit = getAttr(abfahrtHaltestelle, 'plannedWhen')
                richtung = getAttr(abfahrtHaltestelle, 'direction');
                fahrzeugTyp = getAttr(abfahrtHaltestelle, 'line.mode');
                if (fahrzeugMap.has(fahrzeugTyp)) {
                    fahrzeugTyp = fahrzeugMap.get(fahrzeugTyp);
                } else {
                    log(`Fahrzeug: ${fahrzeugTyp} in fahrzeugMap nicht vorhanden! Standard-Icon genutzt.`, `warn`);
                    fahrzeugTyp = 'information-outline'
                }
                timeDelay = getAttr(abfahrtHaltestelle, 'delay');
                fahrzeugNummer = getAttr(abfahrtHaltestelle, 'line.name');

                let bemerkungen = getAttr(abfahrtHaltestelle, 'remarks');
                info = '';
                minuten = 0;

                for (let t = 0; t < bemerkungen.length; t++) {
                    if (getAttr(bemerkungen[t], 'type') == 'status') {
                        info += getAttr(bemerkungen[t], 'text');
                        info += ' ';
                    };
                };

                let uhrzeit: string = formatDate(aktuelleAbfahrzeit, 'hh:mm');
                let geplanteUhrzeit: string = formatDate(geplanteAbfahrzeit, 'hh:mm');

                if (timeDelay > 0 && timeDelay != null) {
                    setState(dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Departure', uhrzeit, true);
                    setState(dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Delay', true, true);
                    minuten = Math.round(timeDelay / 60)
                } else {
                    setState(dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Departure', geplanteUhrzeit, true);
                    setState(dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Delay', false, true);
                }

                setState(dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Vehicle', fahrzeugTyp, true);
                setState(dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Direction', richtung, true);

                let notifytext: string = ['Der ' + fahrzeugNummer + ' nach', '\r\n', richtung, '\r\n', 'planmäßige Abfahrtzeit ' + geplanteUhrzeit, '\r\n', 'fährt aktuell um ' + uhrzeit + ' ab.',
                    '\r\n', 'Aktuelle Verspätung beträgt ' + minuten + ' Minuten.'].join('');

                //Bei Verspätung Daten für PopupNotifypage erzeugen und auslösen
                if (timeDelay > verspaetungszeitHaltestelle && verspaetungPopupHaltestelle) {

                    setState(dp_NSPanel + 'popupNotify.popupNotifySleepTimeout', 600, true);            // number in sekunden 0 = aus
                    setState(dp_NSPanel + 'popupNotify.popupNotifyLayout', 1, true);                        // number 1 oder 2
                    setState(dp_NSPanel + 'popupNotify.popupNotifyInternalName', 'DelayFahrplanScript', true);        // string löst den Trigger aus, geschützte Werte sind TasmotaFirmwareUpdate, BerryDriverUpdate, TFTFirmwareUpdate und Wörter die Update enthalten 

                    setState(dp_NSPanel + 'popupNotify.popupNotifyHeading', 'Verspätung', true);                 // string
                    setState(dp_NSPanel + 'popupNotify.popupNotifyHeadingColor', '63488', true);            // string

                    setState(dp_NSPanel + 'popupNotify.popupNotifyIcon', fahrzeugTyp, true);                    // string muss aus der iconMapping.ts sein
                    setState(dp_NSPanel + 'popupNotify.popupNotifyIconColor', '65504', true);               // string 

                    setState(dp_NSPanel + 'popupNotify.popupNotifyButton1Text', 'OK', true);                 // string
                    setState(dp_NSPanel + 'popupNotify.popupNotifyButton1TextColor', '9507', true);        // string  rgb_dec565 Code von 0 bis 65535

                    if (info != '') {
                        setState(dp_NSPanel + 'popupNotify.popupNotifyButton2Text', 'Info', true);                 // string
                        setState(dp_NSPanel + 'popupNotify.popupNotifyButton2TextColor', '9507', true);        // string  rgb_dec565 Code von 0 bis 65535               
                    } else {
                        setState(dp_NSPanel + 'popupNotify.popupNotifyButton2Text', '', true);                 // string  
                    }

                    setState(dp_NSPanel + 'popupNotify.popupNotifyFontIdText', 1, true);                  // number 1-5
                    setState(dp_NSPanel + 'popupNotify.popupNotifyTextColor', '65535', true);               // string
                    setState(dp_NSPanel + 'popupNotify.popupNotifyText', notifytext, true);                    // string muss als letztes gefüllt werden, wegen Trigger im PanelScript

                    log(`popupNotifypage ausgelöst von Haltestelle ${h} Abfahrt ${i} Richtung ${richtung}`);
                }

                if (Debug) log(`Abfahrzeit geplant: ${geplanteAbfahrzeit} Richtung: ${richtung} Fahrzeug: ${fahrzeugTyp} Verspätung in sec: ${timeDelay} aktuelle Abfahrzeit: ${aktuelleAbfahrzeit}`);
                if (Debug) log(`Uhrzeit geplant: ${geplanteUhrzeit}, aktuelle Uhrzeit: ${uhrzeit}`);
                if (Debug) log(`Popup öffnen: ${verspaetungPopupHaltestelle}, Verspätung in Minuten: ${minuten}, Popuptext: ${notifytext}`);
                if (Debug) log(`Zusatzinfomationen: ${info}`);
                if (Debug) log(`Ende Auswertung Daten Haltestelle ${h} Abfahrt ${i}`);
            }
        }
    } catch (err) {
        log(`error at function json_HaltestelleUmwandeln: ${err.message}`, `warn`)
    }
};

/**
 * Auslesen der JSON Date der Route und den einzelnen Abfahrten zu ordnen
 * @param json_Route Json_String mit Daten der Route
 * @param route nummer der Route
 * @returns 
 */
async function json_RouteUmwandeln(json_Route: string, route: string) {
    try {

        let aktuelleAbfahrzeit: string = '';
        let geplanteAbfahrzeit: string = '';
        let richtung: string = '';
        let fahrzeugTyp: string = '';
        let fahrzeugNummer: string = '';
        let timeDelay: number = 0;
        let minuten: number = 0;

        let h = route

        if (parseInt(h) > anzahlAbfahrtenRoute) {
            log(`Es werden Daten nur von ${anzahlAbfahrtenRoute} Route/n ausgewertet. Der Fahrplan-Adapter liefert aber mehr Daten. Ggf die Anzahl der Haltestellen im Script erhöhen.`);
            return;
        } else {
            if (json_Log) log(getState(json_Route).val);

            reset_DataRoute(h)

            let routenPlan: any = JSON.parse(getState(json_Route).val);

            if (Debug) log(`Anzahl der Abfahrten Route ${h}: ${routenPlan.journeys.length}`);

            for (let i = 0; i < routenPlan.journeys.length; i++) {
                if (i == anzahlAbfahrtenRoute) {
                    log(`Es werden nur die ersten ${anzahlAbfahrtenRoute} Abfahrten pro Route eingelesen`, `warn`);
                    break;
                };

                if (Debug) log(`Beginn Auswertung Route ${h} Abfahrt: ${i}`);

                let abfahrtRoute = routenPlan.journeys[i].legs[0];

                if (json_Log) log(JSON.stringify(abfahrtRoute));

                aktuelleAbfahrzeit = getAttr(abfahrtRoute, 'departure');
                geplanteAbfahrzeit = getAttr(abfahrtRoute, 'plannedDeparture')
                richtung = getAttr(abfahrtRoute, 'direction');
                fahrzeugTyp = getAttr(abfahrtRoute, 'line.mode');
                if (fahrzeugMap.has(fahrzeugTyp)) {
                    fahrzeugTyp = fahrzeugMap.get(fahrzeugTyp);
                } else {
                    log(`Fahrzeug: ${fahrzeugTyp} in fahrzeugMap nicht vorhanden! Standard-Icon genutzt.`, `warn`);
                    fahrzeugTyp = 'information-outline'
                }
                timeDelay = getAttr(abfahrtRoute, 'departureDelay');
                fahrzeugNummer = getAttr(abfahrtRoute, 'line.name');
                minuten = 0;

                let uhrzeit: string = formatDate(aktuelleAbfahrzeit, 'hh:mm');
                let geplanteUhrzeit: string = formatDate(geplanteAbfahrzeit, 'hh:mm');

                if (timeDelay > 0 && timeDelay != null) {
                    setState(dp_Userdata + 'FahrplanAnzeiger.Route' + (h) + '.Abfahrt' + String(i) + '.Departure', uhrzeit, true);
                    setState(dp_Userdata + 'FahrplanAnzeiger.Route' + (h) + '.Abfahrt' + String(i) + '.Delay', true, true);
                    minuten = Math.round(timeDelay / 60)
                } else {
                    setState(dp_Userdata + 'FahrplanAnzeiger.Route' + (h) + '.Abfahrt' + String(i) + '.Departure', geplanteUhrzeit, true);
                    setState(dp_Userdata + 'FahrplanAnzeiger.Route' + (h) + '.Abfahrt' + String(i) + '.Delay', false, true);
                }

                setState(dp_Userdata + 'FahrplanAnzeiger.Route' + (h) + '.Abfahrt' + String(i) + '.Vehicle', fahrzeugTyp, true);
                setState(dp_Userdata + 'FahrplanAnzeiger.Route' + (h) + '.Abfahrt' + String(i) + '.Direction', richtung, true);

                let notifytext: string = ['Der ' + fahrzeugNummer + ' nach', '\r\n', richtung, '\r\n', 'planmäßige Abfahrtzeit ' + geplanteUhrzeit, '\r\n',
                'fährt aktuell um ' + uhrzeit + ' ab.', '\r\n', 'Aktuelle Verspätung beträgt ' + minuten + ' Minuten.'].join('');

                //Bei Verspätung Daten für PopupNotifypage erzeugen und auslösen
                if (timeDelay > verspaetungszeitRoute && verspaetungPopupRoute) {

                    setState(dp_NSPanel + 'popupNotify.popupNotifySleepTimeout', 600, true);            // number in sekunden 0 = aus
                    setState(dp_NSPanel + 'popupNotify.popupNotifyLayout', 1, true);                        // number 1 oder 2
                    setState(dp_NSPanel + 'popupNotify.popupNotifyInternalName', 'DelayFahrplanScript', true);        // string löst den Trigger aus, geschützte Werte sind TasmotaFirmwareUpdate, BerryDriverUpdate, TFTFirmwareUpdate und Wörter die Update enthalten 

                    setState(dp_NSPanel + 'popupNotify.popupNotifyHeading', 'Verspätung', true);                 // string
                    setState(dp_NSPanel + 'popupNotify.popupNotifyHeadingColor', '63488', true);            // string

                    setState(dp_NSPanel + 'popupNotify.popupNotifyIcon', fahrzeugTyp, true);                    // string muss aus der iconMapping.ts sein
                    setState(dp_NSPanel + 'popupNotify.popupNotifyIconColor', '65504', true);               // string 

                    setState(dp_NSPanel + 'popupNotify.popupNotifyButton1Text', 'OK', true);                 // string
                    setState(dp_NSPanel + 'popupNotify.popupNotifyButton1TextColor', '9507', true);        // string  rgb_dec565 Code von 0 bis 65535

                    setState(dp_NSPanel + 'popupNotify.popupNotifyButton2Text', '', true);                 // string  

                    setState(dp_NSPanel + 'popupNotify.popupNotifyFontIdText', 1, true);                  // number 1-5
                    setState(dp_NSPanel + 'popupNotify.popupNotifyTextColor', '65535', true);               // string
                    setState(dp_NSPanel + 'popupNotify.popupNotifyText', notifytext, true);                    // string muss als letztes gefüllt werden, wegen Trigger im PanelScript

                    log(`popupNotifypage ausgelöst von Route ${h} Abfahrt ${i} Richtung ${richtung}`);
                }

                if (Debug) log(`Abfahrzeit geplant: ${geplanteAbfahrzeit}, Richtung: ${richtung}, Fahrzeug: ${fahrzeugTyp}, Verspätung in sec: ${timeDelay}, aktuelle Abfahrzeit: ${aktuelleAbfahrzeit}`);
                if (Debug) log(`Uhrzeit geplant: ${geplanteUhrzeit}, aktuelle Uhrzeit: ${uhrzeit}`);
                if (Debug) log(`Popup öffnen: ${verspaetungPopupHaltestelle}, Verspätung in Minuten: ${minuten}, Popuptext: ${notifytext}`);
                if (Debug) log(`Ende Auswertung Daten Route ${h} Abfahrt ${i}`);
            }
        }
    } catch (err) {
        log(`error at function json_RouteUmwandeln: ${err.message}`, `warn`)
    }
};

/**
 * 
 * @param haltestelle Haltestellennummer
 */
function reset_DataHaltestelle(haltestelle: string) {
    for (let i = 0; i < anzahlAbfahrtenHaltestelle; i++) {
        setState(dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + (haltestelle) + '.Abfahrt' + String(i) + '.Departure', '', true);
        setState(dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + (haltestelle) + '.Abfahrt' + String(i) + '.Delay', false, true);
        setState(dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + (haltestelle) + '.Abfahrt' + String(i) + '.Vehicle', '', true);
        setState(dp_Userdata + 'FahrplanAnzeiger.Haltestelle' + (haltestelle) + '.Abfahrt' + String(i) + '.Direction', '', true);
    };
};
/**
 * 
 * @param route Routennummer
 */
function reset_DataRoute(route: string) {
    for (let i = 0; i < anzahlAbfahrtenRoute; i++) {
        setState(dp_Userdata + 'FahrplanAnzeiger.Route' + (route) + '.Abfahrt' + String(i) + '.Departure', '', true);
        setState(dp_Userdata + 'FahrplanAnzeiger.Route' + (route) + '.Abfahrt' + String(i) + '.Delay', false, true);
        setState(dp_Userdata + 'FahrplanAnzeiger.Route' + (route) + '.Abfahrt' + String(i) + '.Vehicle', '', true);
        setState(dp_Userdata + 'FahrplanAnzeiger.Route' + (route) + '.Abfahrt' + String(i) + '.Direction', '', true);
    };
};

/**
 * Trigger für Haltestellen / Anzeigetafel
 * fahrplan.0.DepartureTimetableX.JSON
 */
on(/^fahrplan\.0+\.DepartureTimetable[0-9]+\.JSON/, function (obj) {

    let Haltestellennummer: string = obj.id.substring(29, obj.id.length - 5)

    log(obj.id + `  Haltestellennummer: ${Haltestellennummer}`)

    json_HaltestelleUmwandeln(obj.id, Haltestellennummer)
});



/**
 *  Trigger für Routen
 *  fahrplan.0.X.JSON
 */
on(/^fahrplan\.0+\.[0-9]+\.JSON/, function (obj) {

    let Route: string = obj.id.substring(11, obj.id.length - 5)

    log(`${obj.id} Route: ${Route}`)

    json_RouteUmwandeln(obj.id, Route)
});

/**
 *  Trigger für Button Rückmeldung / Panel Script trigger auf den selben Pfad, darum zwingende Abfrage des popupNotifyInternalName
 */
on({ id: dp_NSPanel + 'popupNotify.popupNotifyAction', change: 'any' }, async function (obj) {
    try {
        const val = obj.state ? obj.state.val : false;
        if (!val) {
            if (Debug) log(`Es wurde Button1 gedrückt`);
        } else if (val) {
            const internalName: string = getState(dp_NSPanel + 'popupNotify.popupNotifyInternalName').val;
            if (internalName.includes('Delay')) {
                if (internalName == 'DelayFahrplanScript') {
                    log(`jetzt kommmt Text 2 ${info}`);
                    setTimeout(function () {
                        setState(dp_NSPanel + 'popupNotify.popupNotifySleepTimeout', 60, true);
                        setState(dp_NSPanel + 'popupNotify.popupNotifyInternalName', 'DelayFahrplanScript', true);
                        //                        setState(dp_NSPanel + 'popupNotify.popupNotifyText', [Info.substring(0, 44), Info.substring(45, 90)].join('\n'), true);                        
                        //                        setState(dp_NSPanel + 'popupNotify.popupNotifyText', Info.substring(91, Info.length), true);
                        setState(dp_NSPanel + 'popupNotify.popupNotifyText', info, true);
                        setState(dp_NSPanel + 'popupNotify.popupNotifyButton2Text', '', true);
                    }, 1000);
                }
            }
            if (Debug) log(`Es wurde Button2 gedrückt`);
        }
    } catch (err) {
        log(`error at Trigger popupNotifyAction: ${err.message}`, `warn`);
    }
});
