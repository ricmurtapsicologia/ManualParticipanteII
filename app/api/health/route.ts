export async function GET() {
  return Response.json({
    status: 'ok',
    app: 'Manual do Participante CATS',
    architecture: 'clean-rebuild',
    wave: 1,
    pages: 10,
    timestamp: new Date().toISOString(),
  });
}
