const electron = require("electron");
const url = require("url");
const path = require("path");
const { protocol } = require("electron");
const sql = require("sqlite3").verbose();
const {app, BrowserWindow, ipcMain} = electron;
const db = new sql.Database("./data.db", sql.OPEN_READWRITE, (err) => {
    if(err) return console.error(err.message);
});
let mainWindow;
app.on('ready', () => {
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration:true,
            contextIsolation:false,
            enableRemoteModule:true
        }
    });
    mainWindow.loadURL(
        url.format({
            pathname:path.join(__dirname, "index.html"),
            protocol:"file:",
            slashes:true
        }));
    ipcMain.on("key:sendvalue", (err, data)=>{
        console.log(data)
    });
    db.all("select isim_soyisim, sicilno from users", [], (err, rows)=>{
        mainWindow.webContents.send('key:sendoutput', rows);
    })
})