/*
Version 3.0 von TT-Tom
das Script erstellt die Datenpunkte und Alias für den Abfallkalender im Sonoff NSPanel
Es wird der iCal Adapter benötigt und eine URL mit Terminen vom Entsorger bzw. eine .ics-Datei mit den Terminen.
gleichzeitig triggert das Script auf dem bereitgestellten JSON im iCal adapter und füllt die 0_userdata.0 Datenpunkte
Weitere Informationen findest du in der FAQ auf Github https://github.com/joBr99/nspanel-lovelace-ui/wiki
*/


const idAbfalliCal:string = 'ical.1'; // iCal Instanz zum Abfallkalender
const idUserdataAbfallVerzeichnis:string = 'Abfallkalender'; // Name des Datenpunktverzeichnis unter 0_userdata.0 -> Strandard = Abfallkalender
const idAliasPanelVerzeichnis:string = 'NSPanel.allgemein'; //Name PanelVerzeichnis unter alias.0. Standard = NSPanel.1
const idAliasAbfallVerzeichnis:string = 'Abfall'; //Name Verzeichnis unterhalb der idPanelverzeichnis  Standard = Abfall

const idZeichenLoeschen:number = 14; // x Zeichen links vom String abziehen, wenn vor dem Eventname noch Text steht z.B. Strassenname; Standard = 0
const idRestmuellName:string = 'Hausmüll'; // Schwarze Tonne
const idWertstoffName:string = 'Gelber Sack'; // Gelbe Tonne / Sack
const idPappePapierName:string = 'Papier';  // Blaue Tonne
const idBioabfaelleName:string = 'Biomüll'; // Braune Tonne

const idDPPruefung:boolean = false; // mit "false" wird die Prüfung der Datenpunkte in 0_userdata.0 und alias.0 ausgesetzt



// ------------------------- Trigger zum füllen der 0_userdata Datenpunkte aus dem json vom ical Adapter -------------------------------
var Muell_JSON, Event2, Color = 0;

// Trigger auf iCal Instanz zur Json Tabelle
on({ id: idAbfalliCal + '.data.table', change: 'ne' }, async function () {

    for (let i = 1; i <= 4; i++) {
        Muell_JSON = getState(idAbfalliCal + '.data.table').val;
        setState('0_userdata.0.' + idUserdataAbfallVerzeichnis + '.' + i + '.date', getAttr(Muell_JSON, (String(i - 1) + '.date')));
        Event2 = subsequenceFromStartLast(getAttr(Muell_JSON, (String(i - 1) + '.event')), idZeichenLoeschen);
        setState('0_userdata.0.' + idUserdataAbfallVerzeichnis + '.' + i + '.event', Event2);
        if (Event2 == idRestmuellName) {
            Color = 33840;
        } else if (Event2 == idBioabfaelleName) {
            Color = 2016;
        } else if (Event2 == idPappePapierName) {
            Color = 31;
        } else if (Event2 == idWertstoffName) {
            Color = 65504;
        }
        setState('0_userdata.0.' + idUserdataAbfallVerzeichnis + '.' + i + '.color', Color);
    }
});

function subsequenceFromStartLast(sequence, at1) {
    var start = at1;
    var end = sequence.length;
    return sequence.slice(start, end);
};
// ------------------------------------- Ende Trigger ------------------------------------

// ------------------------------------- Funktionen zur Prüfung und Erstellung der Datenpunkte in 0_userdata.0 und alias.0 -----------------------
if (idDPPruefung) {
    checkUserdataState();
    await wait(2000);
    checkAliasFolder();
    checkAliasChannel();
    checkAliasState();
};
// Prüfung und ggf. Erstellung der Datenpunkte unter 0_userdata.0
function checkUserdataState() {
    for (i = 1; i <= 4; i++) {
        if (!existsState('0_userdata.0.' + idUserdataAbfallVerzeichnis + '.' + i + '.date')) {
            log('0_userdata.0.' + idUserdataAbfallVerzeichnis + '.' + i + '.date nicht vorhanden, wurde erstellt');
            createState('0_userdata.0.' + idUserdataAbfallVerzeichnis + '.' + i + '.date', '',
                {
                    name: i + '.date',
                    role: 'state',
                    type: 'string',
                    read: true,
                    write: true
                });
        };
        if (!existsState('0_userdata.0.' + idUserdataAbfallVerzeichnis + '.' + i + '.event')) {
            log('0_userdata.0.' + idUserdataAbfallVerzeichnis + '.' + i + '.event nicht vorhanden, wurde erstellt');
            createState('0_userdata.0.' + idUserdataAbfallVerzeichnis + '.' + i + '.event', '',
                {
                    name: i + '.event',
                    role: 'state',
                    type: 'string',
                    read: true,
                    write: true
                });
        };
        if (!existsState('0_userdata.0.' + idUserdataAbfallVerzeichnis + '.' + i + '.color')) {
            log('0_userdata.0.' + idUserdataAbfallVerzeichnis + '.' + i + '.color nicht vorhanden, wurde erstellt');
            createState('0_userdata.0.' + idUserdataAbfallVerzeichnis + '.' + i + '.color', 0,
                {
                    name: i + '.color',
                    role: 'state',
                    type: 'number',
                    read: true,
                    write: true
                });
        };
    };
};
// Prüfung das Alias states vorhanden sind ggf. anlegen
function checkAliasState() {
    for (i = 1; i <= 4; i++) {
        if (!existsState('alias.0.' + idAliasPanelVerzeichnis + '.' + idAliasAbfallVerzeichnis + '.event' + i + '.INFO')) {
            log('Alias State event' + i + '.INFO nicht vorhanden, wird erstellt');
            createAliasState('alias.0.' + idAliasPanelVerzeichnis + '.' + idAliasAbfallVerzeichnis + '.event' + i + '.INFO', '0_userdata.0.' + idUserdataAbfallVerzeichnis + '.' + i + '.date', 'string', 'INFO', 'weather.title');
        } else { log('irgendwasgefunden .event' + i + '.INFO') };
        if (!existsState('alias.0.' + idAliasPanelVerzeichnis + '.' + idAliasAbfallVerzeichnis + '.event' + i + '.LEVEL')) {
            log('Alias State event' + i + '.LEVEL nicht vorhanden, wird erstellt')
            createAliasState('alias.0.' + idAliasPanelVerzeichnis + '.' + idAliasAbfallVerzeichnis + '.event' + i + '.LEVEL', '0_userdata.0.' + idUserdataAbfallVerzeichnis + '.' + i + '.color', 'number', 'LEVEL', 'value.warning');
        } else { log('irgendwasgefunden .event' + i + '.LEVEL') };
        if (!existsState('alias.0.' + idAliasPanelVerzeichnis + '.' + idAliasAbfallVerzeichnis + '.event' + i + '.TITLE')) {
            log('Alias State event' + i + '.TITLE nicht vorhanden, wird erstellt')
            createAliasState('alias.0.' + idAliasPanelVerzeichnis + '.' + idAliasAbfallVerzeichnis + '.event' + i + '.TITLE', '0_userdata.0.' + idUserdataAbfallVerzeichnis + '.' + i + '.event', 'string', 'TITLE', 'weather.title.short');
        } else { log('irgendwasgefunden .event' + i + '.TITLE') };
    };

};
// Erstellt ein State unter Alias.0
function createAliasState(idDst, idSrc, typeAlias, nameAlias, role) {
    var obj = {};
    obj.type = 'state';
    obj.common = getObject(idSrc).common;
    obj.common.alias = {};
    obj.common.alias.id = idSrc;
    obj.common.type = typeAlias;
    obj.common.name = nameAlias;
    obj.common.role = role;
    obj.native = {};
    setObject(idDst, obj);
};
// Prüfung das Alias Channel vorhanden sind ggf. anlegen
function checkAliasChannel() {
    for (i = 1; i <= 4; i++) {
        if (!existsObject('alias.0.' + idAliasPanelVerzeichnis + '.' + idAliasAbfallVerzeichnis + '.event' + i)) {
            log('Alias Channel ' + idAliasAbfallVerzeichnis + '.event' + i + ' nicht vorhanden');
            createAliasChannel('alias.0.' + idAliasPanelVerzeichnis + '.' + idAliasAbfallVerzeichnis + '.event' + i, idAliasAbfallVerzeichnis + '.event' + i, 'warning');
        }
    }
};
// Erstellt ein Channel unter Alias.0
function createAliasChannel(idDst, nameAlias, role) {
    var obj = {};
    obj.type = 'channel';
    obj.common = {};
    obj.common.name = {};
    obj.common.name.de = nameAlias;
    obj.common.role = role;
    obj.native = {};
    setObject(idDst, obj);
};
// Prüfung das Alias Folder vorhanden sind ggf. anlegen
function checkAliasFolder() {
    if (!existsObject('alias.0.' + idAliasPanelVerzeichnis)) {
        log('Alias Folder ' + idAliasPanelVerzeichnis + ' nicht vorhanden');
        createAliasFolder('alias.0.' + idAliasPanelVerzeichnis, idAliasPanelVerzeichnis);
    };
}
// erstellt ein Folder unter Alias.0
function createAliasFolder(idDst, nameAlias) {
    var obj = {};
    obj.type = 'folder';
    obj.common = {};
    obj.common.name = nameAlias;
    obj.native = {};
    setObject(idDst, obj);
};
// --------------------------- Ende Funktionen Datenpunkte ------------------------------------------------


