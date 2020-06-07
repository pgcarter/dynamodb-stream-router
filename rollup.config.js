import typescript from 'rollup-plugin-typescript';
import pkg from './package.json';

export default [
	// CommonJS (for Node) and ES module (for bundlers) build.
	// (We could have three entries in the configuration array
	// instead of two, but it's quicker to generate multiple
	// builds from a single configuration where possible, using
	// an array for the `output` option, where we can specify
	// `file` and `format` for each target)
	{
		input: 'src/index.ts',
		external: ['aws-sdk', 'aws-lambda'],
		plugins: [
			typescript({
				include:  [ '*.ts+(|x)', '**/*.ts+(|x)', '*.d.ts', '**/*.d.ts'  ],
			}) // so Rollup can convert TypeScript to JavaScript
		],
		output: [
			{ file: pkg.main, format: 'cjs' ,  exports: 'named', sourcemap: true},
			{ file: pkg.module, format: 'es',  exports: 'named', sourcemap: true }
		]
	}
];
