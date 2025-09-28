
import fetch from 'node-fetch';

const GOOGLE_MAPS_API_KEY_DISTANCE = 'AIzaSyADSCUHjzyFUwjfcui_lk6vDSQ3PU0bu7g';

export default async function handler(req, res) {
  const { origins, destinations } = req.query;

  if (!origins || !destinations) {
    return res.status(400).json({ error: 'Origem e destino são obrigatórios' });
  }

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&key=${GOOGLE_MAPS_API_KEY_DISTANCE}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar a distância da API do Google' });
  }
}