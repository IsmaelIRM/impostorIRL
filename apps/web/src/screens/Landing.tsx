import React, { useState } from "react";
import { gql, useMutation } from "@apollo/client";

const CREATE_ROOM = gql`
  mutation CreateRoom($name: String!) {
    createRoom(name: $name) {
      code
    }
  }
`;

export function Landing() {
  const [name, setName] = useState("");
  const [createRoom, { loading }] = useMutation(CREATE_ROOM);

  const handleCreateRoom = async () => {
    if (!name.trim()) return;
    const { data } = await createRoom({ variables: { name } });
    window.location.href = `/lobby/${data.createRoom.code}`;
  };

  return (
    <div className="landing">
      <h2>Crear Sala</h2>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del anfitrión"
      />
      <button onClick={handleCreateRoom} disabled={loading}>
        Crear
      </button>
    </div>
  );
}