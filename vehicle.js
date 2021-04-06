const tjs = require("teslajs");
const {socketError} = require("./socketlog");

let vehicle;
let authToken;

const init = async () => {
    return new Promise((resolve, reject) => {
        tjs.login({
            username: "jake.lauer@gmail.com",
            password: "iMZocMiFqDWQb4Mf8yLtnfhH"
        }, (err, result) => {
            if (!err) {
                authToken = result.authToken;
                tjs.vehicle({
                    authToken
                }, (err2, vh) => {
                    if (!err2) {
                        vehicle = vh;
                        resolve(vehicle);
                    } else {
                        reject(err2)
                    }
                });
            } else {
                reject(err);
            }
        });
    });
}

const getVehicle = async () => {
    try {
        return vehicle || await init();
    } catch (e) {
        socketError(e);
    }
}

const getVehicleStatus = async (vehicle) => {
    return new Promise((resolve, reject) => {
        tjs.vehicleData({
            authToken: authToken,
            vehicleID: vehicle.id
        }, (err, vd) => {
            if (err) {
                reject(err);
            } else if (vd) {
                resolve(vd);
            } else {
                reject("Request succeeded but got no data")
            }
        })
    })
}

const pause = () => {
    return new Promise((resolve, reject) => {
        getVehicle().then(vehicle => {
            tjs.mediaTogglePlayback({
                authToken: authToken,
                vehicleID: vehicle.id
            }, resolve());
        })
    })
};

module.exports = {
    getVehicle,
    getVehicleStatus,
    pause
}