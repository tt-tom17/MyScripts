// Version 0.0.3
// auslesen der Daten aus dem Adapter Fahrplan und zusammenstellen für das Sonoff NSPanel
// Die Farben für die Notifypage können unter https://nodtem66.github.io/nextion-hmi-color-convert/index.html


const Inst_Fahrplan: string = 'fahrplan.0.';        // Instanz vom Fahrplan Adapter
const DP_NSPanel: string = '0_userdata.0.NSPanel.1.';        // Standard 0_userdata.0.NSPanel.1.
const DP_userdata: string = '0_userdata.0.';        // Pafad unter 0_userdata.0  Automatisch wird "FahrplanAnzeiger.HaltestelleX.AbfahrtX" durch das Script erzeugt
const DP_AliasNSPanel: string = 'alias.0.';         // Pfad unter alias.0       Automatisch wird "FahrplanAnzeiger.HaltestelleX.AbfahrtX" durch das Script erzeugt
const AnzahlHaltestellen: number = 3;               // Anzahl der Haltestellen / Anzeigetafeln
const VerspätungPopup: boolean = true;              // Bei Verspätung soll PopupNotifypage auf dem Panel angezeigt werden

const Debug = false;

// erstellen der Datenpunkte in 0_userdata.0 und alias.0 je Haltestelle
async function Init_Datenpunkte() {
    try {
        for (let h = 0; h < AnzahlHaltestellen; h++) {
            for (let i = 0; i < 6; i++) {
                if (existsObject(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i)) == false) {
                    console.log('Datenpunkte werden angelegt')
                    await createStateAsync(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Abfahrzeit', '00:00', { type: 'string' });
                    await createStateAsync(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Richtung', 'Hbf', { type: 'string' });
                    await createStateAsync(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Fahrzeug', 'train', { type: 'string' });
                    await createStateAsync(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Verspätung', false, { type: 'boolean' });
                    setObject(DP_AliasNSPanel + 'FahrplanAnzeiger.Haltestelle' + String(h), { type: 'device', common: { role: 'timeTable', name: 'Haltestelle ' + String(h) }, native: {} });
                    setObject(DP_AliasNSPanel + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i), { type: 'channel', common: { role: 'timeTable', name: 'Abfahrt ' + String(i) }, native: {} });
                    await createAliasAsync(DP_AliasNSPanel + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.ACTUAL', DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Abfahrzeit', true, <iobJS.StateCommon>{ type: 'string', role: 'state', name: {de:'Abfahrzeit', en:'Departure' }});
                    await createAliasAsync(DP_AliasNSPanel + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Richtung', DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Richtung', true, <iobJS.StateCommon>{ type: 'string', role: 'state', name: {de: 'Richtung', en: 'Direction'} });
                    await createAliasAsync(DP_AliasNSPanel + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Fahrzeug', DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Fahrzeug', true, <iobJS.StateCommon>{ type: 'string', role: 'state', name: {de: 'Fahrzeug', en: 'vehicle'} });
                    await createAliasAsync(DP_AliasNSPanel + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Verspätung', DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Verspätung', true, <iobJS.StateCommon>{ type: 'boolean', role: 'state', name: {de:'Verspätung', en: 'Delay'} });
                    console.log('Fertig')
                } else {
                    console.log('Datenpunkte vorhanden')
                }
            }
        }
    } catch (err) {
        console.warn('error at function Init_Datenpunkte: ' + err.message);
    }
}
Init_Datenpunkte();

//Auslesen der JSON Datender HAltestelle und den einzelnen Abfahrten zu ordnen -> max 6 Abfahrten pro Haltestelle
async function JSON_Umwandeln(JSON_Plan: string, Haltestelle: string) {
    try {

        let AktuelleAbfahrzeit: string = '';
        let GeplanteAbfahrzeit: string = '';
        let Richtung: string = '';
        let Fahrzeug: string = '';
        let Fahrzeugnummer: string = '';
        let timedelay: number = 0;
        let Minuten: number = 0;
        let Verspätung: boolean = false;


        //if (Debug) console.log(getState(JSON_Plan).val);

        let h = Haltestelle

        Reset_Data(h)

        let HaltestellenPlan: any = JSON.parse(getState(JSON_Plan).val);

        if (Debug) console.log('Anzahl der Abfahrten Haltestelle ' + (h) + ': ' + HaltestellenPlan.length);

        for (let i = 0; i < HaltestellenPlan.length; i++) {

            if (i == 6) {
                console.warn('Es werden nur die ersten 6 Abfahrten pro Haltestelle eingelesen');
                break;
            };

            const Abfahrt = HaltestellenPlan[i];

            AktuelleAbfahrzeit = getAttr(Abfahrt, 'when');
            GeplanteAbfahrzeit = getAttr(Abfahrt, 'plannedWhen')
            Richtung = getAttr(Abfahrt, 'direction');
            Fahrzeug = getAttr(Abfahrt, 'line.mode');
            timedelay = getAttr(Abfahrt, 'delay');
            Fahrzeugnummer = getAttr(Abfahrt, 'line.name');

            let Uhrzeit: string = formatDate(AktuelleAbfahrzeit, 'hh:mm');
            let geplanteUhrzeit: string = formatDate(GeplanteAbfahrzeit, 'hh:mm');

            if (timedelay > 0 && timedelay != null) {
                setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Abfahrzeit', Uhrzeit, true);
                setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Verspätung', true, true);
                Verspätung = true;
                Minuten = Math.round(timedelay / 60)
            } else {
                setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Abfahrzeit', geplanteUhrzeit, true);
                setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Verspätung', false, true);
                Verspätung = false;
            }

            setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Fahrzeug', Fahrzeug, true);
            setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Richtung', Richtung, true);

            let Notifytext: string = ['Der ' + Fahrzeugnummer + ' nach', '\r\n', Richtung, '\r\n', 'planmäßige Abfahrtzeit ' + geplanteUhrzeit, '\r\n', 'fährt aktuell um ' + Uhrzeit + ' ab.', '\r\n', 'Aktuelle Verspätung beträgt ' + Minuten + ' Minuten.'].join('');

            //Bei Verspätung Daten für PopupNotifypage erzeugen und auslösen
            if (Verspätung && VerspätungPopup) {
                setState(DP_NSPanel + 'popupNotify.popupNotifyHeading', 'Verspätung', true);                 // string
                setState(DP_NSPanel + 'popupNotify.popupNotifyHeadingColor', '63488', true);            // string
                setState(DP_NSPanel + 'popupNotify.popupNotifyIcon', Fahrzeug, true);                    // string muss aus der iconMapping.ts sein
                setState(DP_NSPanel + 'popupNotify.popupNotifyIconColor', '65504', true);               // string 
                setState(DP_NSPanel + 'popupNotify.popupNotifyFontIdText', 1, true);                  // number 1-5
                setState(DP_NSPanel + 'popupNotify.popupNotifyText', Notifytext, true);                    // string
                setState(DP_NSPanel + 'popupNotify.popupNotifyTextColor', '65535', true);               // string
                setState(DP_NSPanel + 'popupNotify.popupNotifyButton1Text', 'OK', true);                 // string
                setState(DP_NSPanel + 'popupNotify.popupNotifyButton1TextColor', '9507', true);        // string  rgb_dec565 Code von 0 bis 65535
                setState(DP_NSPanel + 'popupNotify.popupNotifySleepTimeout', 0, true);            // number in sekunden 0 = aus
                setState(DP_NSPanel + 'popupNotify.popupNotifyLayout', 1, true);                        // number 1 oder 2
                setState(DP_NSPanel + 'popupNotify.popupNotifyInternalName', 'Delay', true);        // string löst den Trigger aus, geschützte Werte sind TasmotaFirmwareUpdate, BerryDriverUpdate, TFTFirmwareUpdate und Wörter die Update enthalten 
                console.log('popupNotifypage ausgelöst Haltestelle ' + (h) + ' Abfahrt ' + String(i) + ' Richtung ', + Richtung);
            }






            if (Debug) console.log('Abfahrt: ' + i);
            if (Debug) console.log('Abfahrzeit geplant: ' + GeplanteAbfahrzeit + ' Richtung: ' + Richtung + ' Fahrzeug: ' + Fahrzeug + ' Verspätung in sec: ' + timedelay + ' aktuelle Abfahrzeit: ' + AktuelleAbfahrzeit);
            if (Debug) console.log('Uhrzeit geplant: ' + geplanteUhrzeit + ' aktuelle Uhrzeit: ' + Uhrzeit);
            if (Debug) console.log('Verspätung: ' + Verspätung + ' popup: ' + VerspätungPopup + ' Minuten: ' + Minuten)

        };

    } catch (err) {
        console.warn('error at function jsonDatenUmwandeln: ' + err.message)
    }
};

function Reset_Data(Haltestelle: string) {
    for (let i = 0; i < 6; i++) {
        setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (Haltestelle) + '.Abfahrt' + String(i) + '.Abfahrzeit', '', true);
        setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (Haltestelle) + '.Abfahrt' + String(i) + '.Verspätung', false, true);
        setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (Haltestelle) + '.Abfahrt' + String(i) + '.Fahrzeug', '', true);
        setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (Haltestelle) + '.Abfahrt' + String(i) + '.Richtung', '', true);
    };
};


// fahrplan.0.DepartureTimetableX.JSON
on(/^fahrplan\.0+\.DepartureTimetable[0-9]+\.JSON/, function (obj) {

    let Haltestellennummer: string = obj.id.substring(29, obj.id.length - 5)

    console.log(obj.id + ' Haltestellennummer: ' + Haltestellennummer)

    JSON_Umwandeln(obj.id, Haltestellennummer)
}
);




