<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" /></a>
</p>

[travis-image]: https://api.travis-ci.org/nestjs/nest.svg?branch=master
[travis-url]: https://travis-ci.org/nestjs/nest
[linux-image]: https://img.shields.io/travis/nestjs/nest/master.svg?label=linux
[linux-url]: https://travis-ci.org/nestjs/nest
  
  <p align="center">A progressive <a href="http://nodejs.org" target="blank">Node.js</a> framework for building efficient and scalable server-side applications, heavily inspired by <a href="https://angular.io" target="blank">Angular</a>.</p>
    <p align="center">
</p>

---

<p align="center">This repository is archived as I do not plan to update it again. However, the code here should be valid and used as a tool to understand how to create retryable HTTP requests uisng NestJS's HttpService</p>

---

# Retryable-HttpService-NestJS

## Description

By default, if [Axios](https://github.com/axios/axiosgi) receives any HTTP status code that is not in the 200-300 range, it will throw an error and reject the call (via `Promise.reject`). NestJS uses Axios as the underlying HttpService for the HttpModule, which can be injected into any service class, but wraps the response in an Observable. With the response being an RxJS Observable, a lot of really cool things can happen, including response mapping using `map`, internal error handling with `catchError` and even spying on the response with `tap`. However, this all only happen is Axios `resolves` the promise instead of rejecting it (i.e. if the return code is 2xx). This is a problem for any sort retrying you may want to try to do, so here's how it can be fixed.

## Configuration

Either in your `HttpModule` import in in the `HttpService` call, you can pass configuration options to Axios for it to know how to react. I decided to do this at the service level, but it is possible to do in the module's import using `HttpModule.register()` or `HttpModule.registerAsync()`. Looking at the Axios config options, there is one calls `validateStatus` which is usually a function that takes in a number and returns a boolean, to determine what to do with the status code. This is where Axios by default determines that a `status >= 200 && status < 300` is an acceptable response and resolves the promise otherwise rejects. We can either add in our own functionality to determine if the status is a 404 then reject, or if it is a 400 resolve, or we can just set the function directly to `null` or `undefined` and let the function always return `true` (according to the Axios config docs).

Phew, now that we have the `validateStatus` returning true, we always get an observable response, and we can start retrying our Http calls that fail. To do this, we'll need to make use of the `mergeMap` RxJS operator, to determine what kind of operation to take. 

```ts
@Injectable()
export class MyService {

  constructor(private readonly httpService: HttpService) {}

  getBadHttpCall(): Observable<any> {
    return this.httpService.get('https://www.google.com/item/character', { validateStatus: null }).pipe(
      mergeMap(val => {
        if (val.status >= 400) {
          return throwError(`Received status ${val.status} from HTTP call`);
        }
        return of (val.data);
      }),
      retry(2),
      catchError(err => {
        return of(err);
      }),
    );
  }
}
```

The above class uses `mergeMap` to check the response sent back from the HTTP call, and if the status code is 400 or greater, we decide to throw and error with the RxJs `throwError` function that allows the `retry` function to get called and fire up to the max number of times we decide. If the HTTP call returns a valid response (either a redirect or a success) we return an observable of the data sent back. This allows us to get rid of the type `Observable<AxiosResponse<any>>` and just have `Observable<any>` which is a little bit more manageable. Lastly, if we do surpass the max number of calls for `retry`, the `catchError` operator will catch the error and return the error thrown as a message to the end client (or the next function in the stack to subscribe to the observable).

## Testing

So, testing this is a bit tricky, as the http function never gets "called" again, but the http request is made several times. After some Google-fu and understanding what's happening (I think), I was able to find an [answer on StackOverflow](https://stackoverflow.com/a/54083350/9576186) that led me to making an `Observer` that could emit whatever I needed it to in the correct order. With this, rather than testing how many times the http function was called, I was able to assert what the final response was, knowing what it should be based on the number of retries. 

```ts
const mockRetryFunction = (times: number, failureValue: any, successValue: any) => {
  let count = 0;
  return Observable.create((observer: Observer<any>) => {
    if (count++ < times) {
      observer.next(failureValue);
    } else {
      observer.next(successValue);
      observer.complete();
    }
  });
};
```

And here is the magical function. You can save this little guy as a test helper and set the values as you expect in each test class, or just put it in each class and move on, your choice. From here, if you have a `times` of 0, you'll get a success immediately. If you have a `times` equal to your number of `retries` you'll get a `success` and if you have a `times` greater than your `retries` you will get a failure. Pretty nifty little tool to have around :).

## Demo

Steps to run the server and see how it works:

1) git clone
2) npm i or yarn i
3) npm run start:dev or yarn start:dev (or just start if you don't want hot reloading)
4) curl http://localhost:3000/fail
5) watch the output
   1) run the curl multiple times to see the output change, based on the static variable in the controller

## End Notes

This is a very basic example of how to be able to retry an http call with NestJS, and many parts of the example should probably have much better checking and error handling. Use this as a means to guide you, but **do not use this in production**.
