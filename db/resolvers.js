const Usuario = require('../models/Usuario');
const Proyecto = require('../models/Proyecto');
const Tarea = require('../models/Tarea');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: 'variables.env'});

const crearToken = (usuario, secreta, expiresIn) => {
    const { id, email, nombre } = usuario;

    return jwt.sign({ id, email, nombre}, secreta, { expiresIn });
}

const resolvers = {
    Query: {
        obtenerProyectos: async (_, {}, ctx) => {
            const proyectos = await Proyecto.find({ creador: ctx.usuario.id});

            return proyectos;
        },
        obtenerTareas: async (_, {input}) => {
            const tareas = await Tarea.find({proyecto: input.proyecto});

            return tareas;
        }
    },
    Mutation: {
        crearUsuario: async (_, {input}) => {
            const { email, password } = input;
            const existeUsuario = await Usuario.findOne({email});

            if(existeUsuario){
                throw new Error('El usuario ya está registrado');
            }

            try {
                const salt = await bcryptjs.genSalt(10);
                input.password = await bcryptjs.hash(password, salt);

                const nuevoUsuario = new Usuario(input);
                
                nuevoUsuario.save();
                return "Usuario creado correctamente";
            } catch (error) {
                console.log(error);
            }
        },
        autenticarUsuario: async (_, {input}) => {
            const { email, password } = input;

            const existeUsuario = await Usuario.findOne({email});

            if(!existeUsuario){
                throw new Error('El usuario no existe');
            }

            const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password);

            if(!passwordCorrecto){
                throw new Error('Password incorrecto');
            }

            return {
                token: crearToken(existeUsuario, process.env.SECRETA, '6hr')
            }
        },
        nuevoProyecto: async (_, {input}, ctx) => {
            try {
                const proyecto = new Proyecto(input);

                proyecto.creador = ctx.usuario.id;

                const resultado = await proyecto.save();

                return resultado;
            } catch (error) {
                console.log(error);
            }
        },
        actualizarProyecto: async (_, {id, input}, ctx) => {
            let proyecto = await Proyecto.findById(id);
            if(!proyecto){
                throw new Error('Proyecto no encontrado');
            }

            if(proyecto.creador.toString() !== ctx.usuario.id){
                throw new Error('No tienes las credenciales para editar este proyecto');
            }

            proyecto = await Proyecto.findByIdAndUpdate({ _id: id}, input, {new: true});
            return proyecto;
        },
        eliminarProyecto: async (_, {id}, ctx) => {
           let proyecto = await Proyecto.findById(id);
            if(!proyecto){
                throw new Error('Proyecto no encontrado');
            }

            if(proyecto.creador.toString() !== ctx.usuario.id){
                throw new Error('No tienes las credenciales para eliminar este proyecto');
            } 

            await Proyecto.findByIdAndDelete({_id: id});

            return "Proyecto eliminado"; 
        },
        nuevaTarea: async (_, {input}) => {
            try {
                const tarea = new Tarea(input);
                const resultado = await tarea.save();
                return resultado;
            } catch (error) {
                console.log(error);
            }
        },
        actualizarTarea: async (_, {id, input, estado}) => {
            let tarea = await Tarea.findById(id);

            if(!tarea){
                throw new Error('Tarea no encontrada');
            }

            input.estado = estado;

            tarea = await Tarea.findByIdAndUpdate({_id : id}, input, {new: true});

            return tarea;
        },
        eliminarTarea: async (_, {id, input, estado}) => {
            let tarea = await Tarea.findById(id);

            if(!tarea){
                throw new Error('Tarea no encontrada');
            }

            await Tarea.findByIdAndDelete({_id: id});

            return "Tarea eliminada";
        }
    }
}

module.exports = resolvers;