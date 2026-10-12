from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = 'clave_secreta_proyecto_portfolio'

def obtener_conexion():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="portfolio_db"
    )

@app.route('/api/test', methods=['GET'])
def test_conexion():
    try:
        conn = obtener_conexion()
        conn.close()
        return jsonify({"mensaje": "¡Conexión a MySQL exitosa desde Flask!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    nombre = data.get('nombre')
    email = data.get('email')
    password = data.get('password')

    if not nombre or not email or not password:
        return jsonify({"error": "Faltan datos obligatorios"}), 400

    hashed_password = generate_password_hash(password)

    try:
        conn = obtener_conexion()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO usuarios (nombre, email, password) VALUES (%s, %s, %s)",
            (nombre, email, hashed_password)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"mensaje": "Usuario registrado con éxito"}), 201
    except mysql.connector.Error as err:
        return jsonify({"error": "El email ya está registrado o hubo un error", "detalles": str(err)}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    conn = obtener_conexion()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM usuarios WHERE email = %s", (email,))
    usuario = cursor.fetchone()
    cursor.close()
    conn.close()

    if usuario and check_password_hash(usuario['password'], password):
        token = jwt.encode({
            'user_id': usuario['id'],
            'email': usuario['email'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")

        return jsonify({"mensaje": "Login exitoso", "token": token}), 200
    else:
        return jsonify({"error": "Credenciales inválidas"}), 401

if __name__ == '__main__':
    app.run(debug=True, port=5000)