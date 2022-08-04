import { Coordinates, CalculationMethod, PrayerTimes as adhan, Prayer } from 'adhan';
import PrayerTimes from 'prayer-times';
import moment from 'moment';
import Table from 'cli-table';

const kemenagPrayerTimesAPIHost = "https://api.myquran.com/"

// jakarta coordinates
const cityId = 1301
const coordinates = {
  latitude: -5.777508,
  longitude: 106.3977983
}

const timeZone = "+7"

const getFormattedTime = (time) => {
  return moment(time).format("HH:mm")
}

const computePrayerTimeFromAdhan = (coordinates, date) => {
  const adhanCoords = new Coordinates(coordinates.latitude, coordinates.longitude)
  const params = CalculationMethod.Singapore();

  const currentPrayerTimes = new adhan(adhanCoords, date, params)
  return {
    fajr: getFormattedTime(currentPrayerTimes.fajr),
    dhuhr: getFormattedTime(currentPrayerTimes.dhuhr),
    asr: getFormattedTime(currentPrayerTimes.asr),
    maghrib: getFormattedTime(currentPrayerTimes.maghrib),
    isha: getFormattedTime(currentPrayerTimes.isha)
  }
}

const computePrayerTimeFromKemenag = async (cityId, date) => {
  var year = date.getFullYear()
  var month = date.getMonth() + 1
  var date = date.getDate()
  var endpoint = `${kemenagPrayerTimesAPIHost}/v1/sholat/jadwal/${cityId}/${year}/${month}/${date}`

  const res = await fetch(endpoint)
  const data = await res.json()

  return {
    fajr: data.data.jadwal.subuh,
    dhuhr: data.data.jadwal.dzuhur,
    asr: data.data.jadwal.ashar,
    maghrib: data.data.jadwal.maghrib,
    isha: data.data.jadwal.isya

  }
}

const computePrayerTimeFromPrayTimesOrg = (date, coordinates) => {
  let prayTimes = new PrayerTimes
  prayTimes.setMethod('Makkah')

  const prayTimesOrg = prayTimes.getTimes(date, [coordinates.latitude, coordinates.longitude], timeZone, "auto", "24h")

  return {
    fajr: prayTimesOrg.fajr,
    dhuhr: prayTimesOrg.dhuhr,
    asr: prayTimesOrg.asr,
    maghrib: prayTimesOrg.maghrib,
    isha: prayTimesOrg.isha
  }

}
const computeAllPrayerTimes = async (coordinates, date) => {
  const adhan = computePrayerTimeFromAdhan(coordinates, date);
  const kemenag = await computePrayerTimeFromKemenag(cityId, date);
  const prayTimesOrg = computePrayerTimeFromPrayTimesOrg(date, coordinates);

  return { kemenag, adhan, prayTimesOrg }
}

const computeMonthlyPrayerTimes = async (coordinates) => {
  const daysInMonth = moment().daysInMonth()

  let times = []

  for (let i = 1; i <= daysInMonth; i++) {
    const date = moment().date(i)
    const { kemenag, adhan, prayTimesOrg } = await computeAllPrayerTimes(coordinates, date.toDate())
    times.push({
      date: date.format("DD/MM/YYYY"),
      kemenag: kemenag,
      adhan: adhan,
      prayTimesOrg: prayTimesOrg
    })
  }

  let table = new Table({
    head: ['Date',
      '\nkemenag', 'Fajr\ndhanjs', '\npraytimes.org',
      '\nkemenag', 'dhuhr\ndhanjs', '\npraytimes.org',
      '\nkemenag', 'asr\ndhanjs', '\npraytimes.org',
      '\nkemenag', 'maghrib\ndhanjs', '\npraytimes.org',
      '\nkemenag', 'isha\ndhanjs', '\npraytimes.org'
    ]
  })

  times.forEach(time => {
    table.push([
      time.date,
      time.kemenag.fajr,
      time.adhan.fajr,
      time.prayTimesOrg.fajr,

      time.kemenag.dhuhr,
      time.adhan.dhuhr,
      time.prayTimesOrg.dhuhr,

      time.kemenag.asr,
      time.adhan.asr,
      time.prayTimesOrg.asr,

      time.kemenag.maghrib,
      time.adhan.maghrib,
      time.prayTimesOrg.maghrib,

      time.kemenag.isha,
      time.adhan.isha,
      time.prayTimesOrg.isha
    ])

  })

  return table.toString()
}

console.log(await computeMonthlyPrayerTimes(coordinates))
