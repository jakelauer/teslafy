const tjs = require("teslajs");

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
    return vehicle || await init();
}

const getVehicleStatus = async (vehicle) => {
    console.log("vehi: " + vehi);
    return new Promise((resolve, reject) => {
        tjs.vehicleData({
            authToken: authToken,
            vehicleID: vehicle.id
        }, (err, vd) => {
            resolve(vd);
            err && reject(err);
        })
    })
}

const pause = () => {
    return new Promise((resolve, reject) => {
        getVehicle().then(vehicle => {
            tjs.mediaTogglePlayback({
                authToken: authToken,
                vehicleID: vehicle.id
            })
        })
    })
};

module.exports = {
    getVehicle,
    getVehicleStatus,
    pause
}