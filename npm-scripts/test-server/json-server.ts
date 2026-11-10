import jsonServer from 'json-server';
import type { Request, Response, NextFunction } from 'express';

const server = jsonServer.create();
const router = jsonServer.router('npm-scripts/test-server/db.json');
const middlewares = jsonServer.defaults();

server.use(jsonServer.bodyParser);
server.use(middlewares);

// если нужно на любой гет возвращать какие то свои данные или катомную обработку
// server.use((req: Request, res: Response, next: NextFunction) => {
//   if (req.method === 'GET') {
//     res.statusCode = 200;
//     res.setHeader('Content-Type', 'text/plain');
//     res.end('N'); // что то надо вернуть, в данном случае просто N
//   } else {
//     next();
//   }
// });

server.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST') {
    const path = req.path.replace(/\//g, '');
    const query = req.query;

    const excludePath = ['form']; // массив путей, которые нельзя перезаписывать штатным методом POST
    // @ts-expect-error нет нормального метода для получения данных json
    const data = router.db.__wrapped__[path];
    // const body = req.body;

    // если есть данные в которые мы хотим записать новые, например добавить карточку
    if (data && !excludePath.includes(path)) {
      next();
      return;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // если в параметрах указано параметр test, то возвращаем данные из того объекта, который указан в параметре test
    if (data[query.test]) {
      res.end(JSON.stringify(data[query.test]));
    } else {
      res.end(JSON.stringify(data));
    }
  } else {
    next();
  }
});

server.use(router);

server.listen(3010, () => {
  console.log('JSON Server is running');
});
