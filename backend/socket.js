import { Server } from "socket.io";

let io = null;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // Keep it simple and open for dev, Angular client handles proxies or direct connections
            methods: ["GET", "POST", "PUT", "DELETE"]
        }
    });

    io.on("connection", (socket) => {
        console.log(`🔌 [SOCKET] New client connected: ${socket.id}`);

        socket.on("join_room", (roomName) => {
            socket.join(roomName);
            console.log(`🔌 [SOCKET] Socket ${socket.id} joined room: ${roomName}`);
        });

        socket.on("disconnect", () => {
            console.log(`🔌 [SOCKET] Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io has not been initialized!");
    }
    return io;
};

// Real-time helper: broadcast changes to all clients
export const broadcastAvailability = (data) => {
    if (io) {
        console.log("📢 [SOCKET] Broadcasting availability_change:", data);
        io.emit("availability_change", data);
    }
};

export const broadcastNotification = (data) => {
    if (io) {
        console.log("📢 [SOCKET] Broadcasting new_notification:", data);
        io.emit("new_notification", data);
    }
};
