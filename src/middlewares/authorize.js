module.exports = (req, res, next) => {
    const { authorization } = req.headers;
    if (!authorization) {
        return res.status(401).send({ error: 'you must be logged in' })

    }

    const token = authorization.replace('Bearer ', '')
    jwt.verify(token, 'my_secret_key', async (err, payload) => {
        if (err) {
            return res.status(401).send({ error: 'you must be logged in' })

        }

    })


}