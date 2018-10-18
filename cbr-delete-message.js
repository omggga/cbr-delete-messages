'use strict'

const request = require('request')
const qs = require('querystring')
const cheerio = require('cheerio')

class CbrHttpClient {
	constructor() {}

	async delete(id) {
		const cookiesAfterLogin = await login()
		const messageData = await getMessageData(cookiesAfterLogin, id)
		const token = getAuthToken(messageData.body)
		return deleteMessage(id, token, cookiesAfterLogin, messageData.cookie)
	}
}

async function login() {
	const authForm = {
		UserName: '##############',
		Password: '##############',
		ReturnUrl: '/Home'
	}
	const loginFormData = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		uri: 'https://portal4.cbr.ru/Account/LogIn',
		body: qs.stringify(authForm),
		method: 'POST'
	}
	const loginData = await requestData(loginFormData)
	const cookies = loginData.res.headers['set-cookie']
	if (!cookies) {
		throw new Error(`Ошибка при получении авторизационных cookie от portal4.cbr.ru`)
	}
	return cookies
}

async function getMessageData(cookies, id) {
	const messageData = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Cookie: cookies
		},
		uri: 'https://portal4.cbr.ru/Messages/ViewMessage/' + id,
		followAllRedirects: true,
		method: 'GET'
	}
	const message = await requestData(messageData)
	const messageBody = message.body
	let cookiesAfterBody = message.res.headers['set-cookie']
	if (!cookiesAfterBody) {
		throw new Error(`Ошибка при получении cookie для сообщения от portal4.cbr.ru`)
	}
	cookiesAfterBody = cookiesAfterBody
		.join('')
		.replace('path=/;', '')
		.replace('  HttpOnly', '')
	return { cookie: cookiesAfterBody, body: messageBody }
}

const pattern = /<input.*?name="__RequestVerificationToken".*value="(.*?)"/gim
function getAuthToken(body) {
	const matched = body.match(pattern)
	if (!matched) {
		throw new Error(`Ошибка при получении token для сообщения от portal4.cbr.ru`)
	}
	return matchBody[1]
}

async function deleteMessage(id, token, cookiesAfterLogin, cookiesAfterBody) {
	const deleteActionForm = {
		__RequestVerificationToken: token,
		selectedMessages: id
	}
	const cookies =
		cookiesAfterLogin
			.join('; ')
			.replace('HttpOnly', '')
			.replace(' path=/;', '')
			.replace(' path=/; ', '') +
		' ' +
		cookiesAfterBody.replace(';', '')
	const deleteData = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			Cookie: cookies,
			'X-Requested-With': 'XMLHttpRequest'
		},
		uri: 'https://portal4.cbr.ru/Messages/DeleteMessages',
		body: qs.stringify(deleteActionForm),
		method: 'POST'
	}
	return requestData(deleteData)
}

async function requestData(opts) {
	return new Promise(async (resolve, reject) => {
		request(opts, function(err, res, body) {
			if (err) reject(err)
			resolve({ res: res, body: body })
		})
	})
}

module.exports = CbrHttpClient
