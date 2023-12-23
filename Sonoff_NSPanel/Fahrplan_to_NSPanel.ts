/*
 * @author 2023 @tt-tom
 *
 * Dieses Skript dient zur freien Verwendung in ioBroker.
 * Jegliche Verantwortung liegt beim Benutzer. 
 * 
 * Version 1.1.3
 *
 * Setzt NSPanel Script Version 4.3.1.5 oder größer voraus
 * 
 *  12.10.23 - v1.1.0 - Breaking Change - Datenpunkte an das Panel Script angepasst -> vor dem Start des Scripts alten Ordner "Fahrplananzeiger" aus 0_userdata und Alias.0 löschen
 *  13.10.23 - v1.1.1 - Fix additional info
 *  20.12.23 - v1.1.2 - Add mapping line.mode => Iconname
 *  23.12.23 - v1.1.3 - Add Button Info only for additional info
 * 
 * auslesen der Daten aus dem Adapter Fahrplan und zusammenstellen für das Sonoff NSPanel
 * Die Farben für die Notifypage können unter https://nodtem66.github.io/nextion-hmi-color-convert/index.html
*/

const DP_NSPanel: string = '0_userdata.0.NSPanel.1.';        // Standard 0_userdata.0.NSPanel.1.
const DP_userdata: string = '0_userdata.0.NSPanel.';        // Pafad unter 0_userdata.0  Automatisch wird "FahrplanAnzeiger.HaltestelleX.AbfahrtX" durch das Script erzeugt
const DP_Alias: string = 'alias.0.NSPanel.';         // Pfad unter alias.0       Automatisch wird "FahrplanAnzeiger.HaltestelleX.AbfahrtX" durch das Script erzeugt
const AnzahlHaltestellen: number = 1;               // Anzahl der Haltestellen / Anzeigetafeln
const AnzahlAbfahrten: number = 4;                     // Abfahrten an der Haltestelle -> mehr als 4 kann das NSPanel noch nicht anzeigen
const VerspaetungPopup: boolean = true;             // Bei Verspätung soll PopupNotifypage auf dem Panel angezeigt werden
const Verspaetungszeit: number = 300;               // Verspätungszeit in sek
let Info: string = '';

const Debug = false;


// Map für icon => [line.mode vom Fahrplan, Iconname aus der Icon-Datei (NSPanel)]
const FahrzeugMap = new Map([
    ['bus', 'bus'],
    ['train', 'train']
]);

// erstellen der Datenpunkte in 0_userdata.0 und alias.0 je Haltestelle
async function Init_Datenpunkte() {
    try {
        for (let h = 0; h < AnzahlHaltestellen; h++) {
            for (let i = 0; i < AnzahlAbfahrten; i++) {
                if (existsObject(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i)) == false) {
                    log('Datenpunkte werden angelegt')
                    await createStateAsync(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Departure', '00:00', { type: 'string', name: { de: 'Abfahrzeit', en: 'Departure time' } });
                    await createStateAsync(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Direction', 'Hbf', { type: 'string', name: { de: 'Richtung', en: 'Direction' } });
                    await createStateAsync(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Vehicle', 'train', { type: 'string', name: { de: 'Fahrzeug', en: 'Vehicle' } });
                    await createStateAsync(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Delay', false, { type: 'boolean', name: { de: 'Verspätung', en: 'Delay' } });
                    setObject(DP_Alias + 'FahrplanAnzeiger.Haltestelle' + String(h), { type: 'device', common: { role: 'timeTable', name: { de: 'Haltestelle ' + String(h), en: 'Station ' + String(h) } }, native: {} });
                    setObject(DP_Alias + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i), { type: 'channel', common: { role: 'timeTable', name: { de: 'Abfahrt ' + String(i), en: 'Departure ' + String(i) } }, native: {} });
                    await createAliasAsync(DP_Alias + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.ACTUAL', DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Departure', true, <iobJS.StateCommon>{ type: 'string', role: 'state', name: { de: 'Abfahrzeit', en: 'Departure time' } });
                    await createAliasAsync(DP_Alias + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.DIRECTION', DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Direction', true, <iobJS.StateCommon>{ type: 'string', role: 'state', name: { de: 'Richtung', en: 'Direction' } });
                    await createAliasAsync(DP_Alias + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.VEHICLE', DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Vehicle', true, <iobJS.StateCommon>{ type: 'string', role: 'state', name: { de: 'Fahrzeug', en: 'Vehicle' } });
                    await createAliasAsync(DP_Alias + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.DELAY', DP_userdata + 'FahrplanAnzeiger.Haltestelle' + String(h) + '.Abfahrt' + String(i) + '.Delay', true, <iobJS.StateCommon>{ type: 'boolean', role: 'state', name: { de: 'Verspätung', en: 'Delay' } });
                    log('Fertig')
                } else {
                    log('Datenpunkte vorhanden')
                }
            }
        }
    } catch (err) {
        log('error at function Init_Datenpunkte: ' + err.message, 'warn');
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
        let Timedelay: number = 0;
        let Minuten: number = 0;

        let h = Haltestelle

        if (parseInt(h) >= AnzahlHaltestellen) {
            log('Es werden Daten nur von ' + AnzahlHaltestellen + ' Haltestelle/n ausgewertet. Der Fahrplan-Adapter liefert aber mehr Daten. Ggf die Anzahl der Haltestellen im Script erhöhen.');
        } else {


//            if (Debug) log(getState(JSON_Plan).val);

            Reset_Data(h)

            let HaltestellenPlan: any = JSON.parse(getState(JSON_Plan).val);

            if (Debug) log('Anzahl der Abfahrten Haltestelle ' + (h) + ': ' + HaltestellenPlan.length);

            for (let i = 0; i < HaltestellenPlan.length; i++) {

                if (i == AnzahlAbfahrten) {
                    console.warn('Es werden nur die ersten ' + AnzahlAbfahrten + ' Abfahrten pro Haltestelle eingelesen');
                    break;
                };

                if (Debug) console.log('Beginn Auswertung Abfahrt: ' + i);

                let Abfahrt = HaltestellenPlan[i];

                AktuelleAbfahrzeit = getAttr(Abfahrt, 'when');
                GeplanteAbfahrzeit = getAttr(Abfahrt, 'plannedWhen')
                Richtung = getAttr(Abfahrt, 'direction');
                Fahrzeug = getAttr(Abfahrt, 'line.mode');
                if (FahrzeugMap.has(Fahrzeug)){
                Fahrzeug = FahrzeugMap.get(Fahrzeug);
                } else {
                    log('Fahrzeug: ' + Fahrzeug + ' in FahrzeugMap nicht vorhanden! Standard-Icon genutzt.', 'warn');
                Fahrzeug = 'information-outline'
                }
                Timedelay = getAttr(Abfahrt, 'delay');
                Fahrzeugnummer = getAttr(Abfahrt, 'line.name');

                let Bemerkungen = getAttr(Abfahrt, 'remarks');
                Info = '';
                Minuten = 0;

                for (let t = 0; t < Bemerkungen.length; t++) {
                    if (getAttr(Bemerkungen[t], 'type') == 'status') {
                        Info += getAttr(Bemerkungen[t], 'text');
                        Info += ' ';
                    };
                };

                let Uhrzeit: string = formatDate(AktuelleAbfahrzeit, 'hh:mm');
                let GeplanteUhrzeit: string = formatDate(GeplanteAbfahrzeit, 'hh:mm');

                if (Timedelay > 0 && Timedelay != null) {
                    setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Departure', Uhrzeit, true);
                    setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Delay', true, true);
                    Minuten = Math.round(Timedelay / 60)
                } else {
                    setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Departure', GeplanteUhrzeit, true);
                    setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Delay', false, true);
                }

                setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Vehicle', Fahrzeug, true);
                setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (h) + '.Abfahrt' + String(i) + '.Direction', Richtung, true);

                let Notifytext: string = ['Der ' + Fahrzeugnummer + ' nach', '\r\n', Richtung, '\r\n', 'planmäßige Abfahrtzeit ' + GeplanteUhrzeit, '\r\n', 'fährt aktuell um ' + Uhrzeit + ' ab.', '\r\n', 'Aktuelle Verspätung beträgt ' + Minuten + ' Minuten.'].join('');

                //Bei Verspätung Daten für PopupNotifypage erzeugen und auslösen
                if (Timedelay > Verspaetungszeit && VerspaetungPopup) {

                    setState(DP_NSPanel + 'popupNotify.popupNotifySleepTimeout', 600, true);            // number in sekunden 0 = aus
                    setState(DP_NSPanel + 'popupNotify.popupNotifyLayout', 1, true);                        // number 1 oder 2
                    setState(DP_NSPanel + 'popupNotify.popupNotifyInternalName', 'DelayFahrplanScript', true);        // string löst den Trigger aus, geschützte Werte sind TasmotaFirmwareUpdate, BerryDriverUpdate, TFTFirmwareUpdate und Wörter die Update enthalten 

                    setState(DP_NSPanel + 'popupNotify.popupNotifyHeading', 'Verspätung', true);                 // string
                    setState(DP_NSPanel + 'popupNotify.popupNotifyHeadingColor', '63488', true);            // string

                    setState(DP_NSPanel + 'popupNotify.popupNotifyIcon', Fahrzeug, true);                    // string muss aus der iconMapping.ts sein
                    setState(DP_NSPanel + 'popupNotify.popupNotifyIconColor', '65504', true);               // string 

                    setState(DP_NSPanel + 'popupNotify.popupNotifyButton1Text', 'OK', true);                 // string
                    setState(DP_NSPanel + 'popupNotify.popupNotifyButton1TextColor', '9507', true);        // string  rgb_dec565 Code von 0 bis 65535

                    if (Info != '') {
                        setState(DP_NSPanel + 'popupNotify.popupNotifyButton2Text', 'Info', true);                 // string
                        setState(DP_NSPanel + 'popupNotify.popupNotifyButton2TextColor', '9507', true);        // string  rgb_dec565 Code von 0 bis 65535               
                    } else {
                        setState(DP_NSPanel + 'popupNotify.popupNotifyButton2Text', '', true);                 // string  
                    }

                    setState(DP_NSPanel + 'popupNotify.popupNotifyFontIdText', 1, true);                  // number 1-5
                    setState(DP_NSPanel + 'popupNotify.popupNotifyTextColor', '65535', true);               // string
                    setState(DP_NSPanel + 'popupNotify.popupNotifyText', Notifytext, true);                    // string muss als letztes gefüllt werden, wegen Trigger im PanelScript

                    log('popupNotifypage ausgelöst Haltestelle ' + (h) + ' Abfahrt ' + String(i) + ' Richtung ' + Richtung);
                }

                if (Debug) log('Beginn Auswertung Abfahrt: ' + i);
                if (Debug) log('Abfahrzeit geplant: ' + GeplanteAbfahrzeit + ' Richtung: ' + Richtung + ' Fahrzeug: ' + Fahrzeug + ' Verspätung in sec: ' + Timedelay + ' aktuelle Abfahrzeit: ' + AktuelleAbfahrzeit);
                if (Debug) log('Uhrzeit geplant: ' + GeplanteUhrzeit + ' aktuelle Uhrzeit: ' + Uhrzeit);
                if (Debug) log('Popup öffnen: ' + VerspaetungPopup + ', Verspätung in Minuten: ' + Minuten);
                if (Debug) log('Zusatzinfomationen: ' + Info);
                if (Debug) log('Ende Auswertung Daten');

            };
        };

    } catch (err) {
        log('error at function jsonDatenUmwandeln: ' + err.message, 'warn')
    }
};

function Reset_Data(Haltestelle: string) {
    for (let i = 0; i < AnzahlAbfahrten; i++) {
        setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (Haltestelle) + '.Abfahrt' + String(i) + '.Departure', '', true);
        setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (Haltestelle) + '.Abfahrt' + String(i) + '.Delay', false, true);
        setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (Haltestelle) + '.Abfahrt' + String(i) + '.Vehicle', '', true);
        setState(DP_userdata + 'FahrplanAnzeiger.Haltestelle' + (Haltestelle) + '.Abfahrt' + String(i) + '.Direction', '', true);
    };
};


// fahrplan.0.DepartureTimetableX.JSON
on(/^fahrplan\.0+\.DepartureTimetable[0-9]+\.JSON/, function (obj) {

    let Haltestellennummer: string = obj.id.substring(29, obj.id.length - 5)

    log(obj.id + ' Haltestellennummer: ' + Haltestellennummer)

    JSON_Umwandeln(obj.id, Haltestellennummer)
}
);
// Trigger für Button Rückmeldung / Panel Script trigger auf den selben Pfad, darum zwingende Abfrage des popupNotifyInternalName
on({ id: DP_NSPanel + 'popupNotify.popupNotifyAction', change: 'any' }, async function (obj) {
    try {
        const val = obj.state ? obj.state.val : false;
        if (!val) {
            if (Debug) log('Es wurde Button1 gedrückt');
        } else if (val) {

            const internalName: string = getState(DP_NSPanel + 'popupNotify.popupNotifyInternalName').val;
            if (internalName.includes('Delay')) {
                if (internalName == 'DelayFahrplanScript') {
                    log('jetzt kommmt Text 2' + Info + '%');
                    setTimeout(function () {
                        setState(DP_NSPanel + 'popupNotify.popupNotifySleepTimeout', 60, true);
                        setState(DP_NSPanel + 'popupNotify.popupNotifyInternalName', 'DelayFahrplanScript', true);
//                        setState(DP_NSPanel + 'popupNotify.popupNotifyText', [Info.substring(0, 44), Info.substring(45, 90)].join('\n'), true);                        
//                        setState(DP_NSPanel + 'popupNotify.popupNotifyText', Info.substring(91, Info.length), true);
                        setState(DP_NSPanel + 'popupNotify.popupNotifyText', Info, true);                        
                        setState(DP_NSPanel + 'popupNotify.popupNotifyButton2Text', '', true);
                    }, 1000);

                };
            };
            if (Debug) log('Es wurde Button2 gedrückt');
        }
    } catch (err) {
        log('error at Trigger popupNotifyAction: ' + err.message, 'warn');
    }
});