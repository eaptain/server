import * as koaRouter from 'koa-router';

const router = new koaRouter();

export default router;

router.all('*', (ctx) => {
    console.log('.....');
    ctx.body = ctx.url;
});